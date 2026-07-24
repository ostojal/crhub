"use server";

import { ATTACHMENTS_BUCKET, MAX_ATTACHMENT_BYTES } from "@/lib/constants";
import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId, normalizeEmail } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

function revalidateAdminPaths() {
  revalidatePath("/admin/mejlovi");
}

// --- Šabloni mejlova ---

export type EmailTemplateInput = {
  id?: number;
  name: string;
  subject: string;
  body: string;
};

export async function saveEmailTemplate(
  input: EmailTemplateInput,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const name = cleanText(input.name, 100);
  const subject = cleanText(input.subject, 300);
  const body = cleanText(input.body, 10000);

  if (!name) return { ok: false, error: "Naziv šablona je obavezan." };
  if (!subject) return { ok: false, error: "Naslov je obavezan." };
  if (!body) return { ok: false, error: "Telo mejla je obavezno." };

  const supabase = createClient();

  if (input.id !== undefined) {
    if (!isId(input.id)) return { ok: false, error: "Nepoznat šablon." };

    const { error } = await supabase
      .from("email_templates")
      .update({ name, subject, body, updated_at: new Date().toISOString() })
      .eq("id", input.id);

    if (error) return { ok: false, error: "Greška pri izmeni šablona." };

    revalidateAdminPaths();
    return { ok: true, message: "Šablon je izmenjen." };
  }

  const { error } = await supabase
    .from("email_templates")
    .insert({ name, subject, body });

  if (error) return { ok: false, error: "Greška pri dodavanju šablona." };

  revalidateAdminPaths();
  return { ok: true, message: "Šablon je dodat." };
}

export async function deleteEmailTemplate(id: number): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(id)) return { ok: false, error: "Nepoznat šablon." };

  const supabase = createClient();
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "Greška pri brisanju šablona." };

  revalidateAdminPaths();
  return { ok: true, message: "Šablon je obrisan." };
}

// --- Prilozi ---

// Ime u bucketu mora biti bezbedno; originalno ime se čuva u koloni `name`
// i ide u mejl kao ime priloga
function storageSafeName(filename: string): string {
  const cleaned = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return cleaned || "prilog";
}

export async function uploadAttachmentTemplate(
  formData: FormData,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Izaberi fajl." };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `Fajl je prevelik (najviše ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB).`,
    };
  }

  const name =
    cleanText(String(formData.get("name") ?? ""), 150) ??
    cleanText(file.name, 150);

  if (!name) return { ok: false, error: "Naziv priloga je obavezan." };

  const supabase = createClient();
  const storagePath = `${Date.now()}-${storageSafeName(file.name)}`;
  const mimeType = file.type || "application/octet-stream";

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });

  if (uploadError) {
    return { ok: false, error: "Greška pri otpremanju fajla." };
  }

  const { error } = await supabase.from("attachment_templates").insert({
    name,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: file.size,
  });

  if (error) {
    // Bez reda u tabeli fajl je nedostupan, pa se odmah uklanja
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: "Greška pri čuvanju priloga." };
  }

  revalidateAdminPaths();
  return { ok: true, message: "Prilog je dodat." };
}

export async function deleteAttachmentTemplate(
  id: number,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(id)) return { ok: false, error: "Nepoznat prilog." };

  const supabase = createClient();

  // Zakazani mejl bi bez fajla pao pri slanju
  const { count } = await supabase
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("status", "scheduled")
    .contains("attachment_ids", [id]);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "Prilog je vezan za zakazane mejlove, pa se ne može obrisati.",
    };
  }

  const { data: attachment } = await supabase
    .from("attachment_templates")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!attachment) return { ok: false, error: "Prilog ne postoji." };

  const { error } = await supabase
    .from("attachment_templates")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "Greška pri brisanju priloga." };

  await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.storage_path]);

  revalidateAdminPaths();
  return { ok: true, message: "Prilog je obrisan." };
}

// --- CC / BCC adrese ---

export async function addCcBccOption(
  rawEmail: string,
  rawLabel?: string,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Email adresa nije ispravna." };

  const label = cleanText(rawLabel, 100);
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("cc_bcc_options")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { ok: false, error: "Adresa je već na listi." };

  const { error } = await supabase
    .from("cc_bcc_options")
    .insert({ email, label });

  if (error) return { ok: false, error: "Greška pri dodavanju adrese." };

  revalidateAdminPaths();
  return { ok: true, message: `Adresa ${email} je dodata.` };
}

export async function deleteCcBccOption(id: number): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(id)) return { ok: false, error: "Nepoznata adresa." };

  const supabase = createClient();
  const { error } = await supabase.from("cc_bcc_options").delete().eq("id", id);

  if (error) return { ok: false, error: "Greška pri brisanju adrese." };

  revalidateAdminPaths();
  return { ok: true, message: "Adresa je uklonjena." };
}
