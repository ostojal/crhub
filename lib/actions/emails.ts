"use server";

import { MAX_SCHEDULE_DAYS, MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/constants";
import { checkRole, type CurrentUser } from "@/lib/dal";
import type { Database } from "@/lib/database.types";
import { decryptSecret } from "@/lib/email/crypto";
import { revokeRefreshToken } from "@/lib/email/google";
import { claimEmail, sendClaimedEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId } from "@/lib/validate";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";
const MAX_RECIPIENTS = 20;
const MAX_ATTACHMENTS = 10;

type Client = SupabaseClient<Database>;

// Isto pravilo kao kod evidentiranja: admin sme svaki kontakt, user samo one
// koji su mu dodeljeni (vidi logInteractions u lib/actions/interactions.ts)
async function hasContactAccess(
  supabase: Client,
  me: CurrentUser,
  contactId: number,
): Promise<boolean> {
  if (me.role === "admin") return true;

  const { data } = await supabase
    .from("assignments")
    .select("id")
    .eq("contact_id", contactId)
    .eq("user_id", me.id)
    .limit(1)
    .maybeSingle();

  return !!data;
}

function revalidateEmailPaths(contactId: number) {
  revalidatePath("/mejlovi");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");
}

export type ComposeContact = {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  city: string | null;
};

export type ComposeContext =
  | {
      ok: true;
      gmail: "connected" | "none" | "broken";
      gmailEmail: string | null;
      contact: ComposeContact;
      templates: { id: number; name: string; subject: string; body: string }[];
      ccOptions: { id: number; email: string; label: string | null }[];
      attachments: { id: number; name: string; size_bytes: number }[];
    }
  | { ok: false; error: string };

// Sve što kompozeru treba, jednim pozivom kad se dijalog otvori
export async function getComposeContext(
  contactId: number,
): Promise<ComposeContext> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const supabase = createClient();
  if (!(await hasContactAccess(supabase, me, contactId))) {
    return { ok: false, error: NO_PERMISSION };
  }

  const [contactRes, tokenRes, templatesRes, ccRes, attachmentsRes] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id, email, first_name, last_name, company, job_title, city")
        .eq("id", contactId)
        .maybeSingle(),
      supabase
        .from("google_tokens")
        .select("google_email, status")
        .eq("user_id", me.id)
        .maybeSingle(),
      supabase
        .from("email_templates")
        .select("id, name, subject, body")
        .order("name", { ascending: true }),
      supabase
        .from("cc_bcc_options")
        .select("id, email, label")
        .order("email", { ascending: true }),
      supabase
        .from("attachment_templates")
        .select("id, name, size_bytes")
        .order("name", { ascending: true }),
    ]);

  if (!contactRes.data) return { ok: false, error: "Kontakt ne postoji." };

  return {
    ok: true,
    gmail: !tokenRes.data
      ? "none"
      : tokenRes.data.status === "broken"
        ? "broken"
        : "connected",
    gmailEmail: tokenRes.data?.google_email ?? null,
    contact: contactRes.data,
    templates: templatesRes.data ?? [],
    ccOptions: ccRes.data ?? [],
    attachments: attachmentsRes.data ?? [],
  };
}

export type ComposeEmailInput = {
  contactId: number;
  cc: number[];
  bcc: number[];
  subject: string;
  body: string;
  attachmentIds: number[];
  // ISO vreme; bez njega se šalje odmah
  scheduledAt?: string;
};

function isIdList(value: unknown, max: number): value is number[] {
  return (
    Array.isArray(value) && value.length <= max && value.every((id) => isId(id))
  );
}

// Adrese se uzimaju iz baze po id-u, nikad iz klijenta — korisnik može da
// izabere samo ono što je admin ponudio
async function resolveRecipients(
  supabase: Client,
  ids: number[],
): Promise<string[] | null> {
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("cc_bcc_options")
    .select("email")
    .in("id", ids);

  if (!data || data.length !== new Set(ids).size) return null;
  return data.map((row) => row.email);
}

export async function composeEmail(
  input: ComposeEmailInput,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(input.contactId)) return { ok: false, error: "Nepoznat kontakt." };
  if (
    !isIdList(input.cc, MAX_RECIPIENTS) ||
    !isIdList(input.bcc, MAX_RECIPIENTS)
  ) {
    return { ok: false, error: "Neispravan izbor CC/BCC adresa." };
  }
  if (!isIdList(input.attachmentIds, MAX_ATTACHMENTS)) {
    return { ok: false, error: "Neispravan izbor priloga." };
  }

  const subject = cleanText(input.subject, 300);
  const body = cleanText(input.body, 10000);
  if (!subject) return { ok: false, error: "Naslov je obavezan." };
  if (!body) return { ok: false, error: "Telo mejla je obavezno." };

  let scheduledAt: string | null = null;
  if (input.scheduledAt) {
    const when = new Date(input.scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "Vreme slanja nije ispravno." };
    }
    // Tolerancija od minut zbog razlike u satu klijenta i servera
    if (when.getTime() < Date.now() - 60_000) {
      return { ok: false, error: "Vreme slanja mora biti u budućnosti." };
    }
    if (when.getTime() > Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) {
      return {
        ok: false,
        error: `Mejl se može zakazati najviše ${MAX_SCHEDULE_DAYS} dana unapred.`,
      };
    }
    scheduledAt = when.toISOString();
  }

  const supabase = createClient();
  if (!(await hasContactAccess(supabase, me, input.contactId))) {
    return { ok: false, error: NO_PERMISSION };
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", input.contactId)
    .maybeSingle();

  if (!contact?.email) {
    return { ok: false, error: "Kontakt nema email adresu." };
  }

  const [cc, bcc] = await Promise.all([
    resolveRecipients(supabase, input.cc),
    resolveRecipients(supabase, input.bcc),
  ]);

  if (!cc || !bcc) {
    return { ok: false, error: "Neka od izabranih CC/BCC adresa ne postoji." };
  }

  if (input.attachmentIds.length > 0) {
    const { data: attachments } = await supabase
      .from("attachment_templates")
      .select("id, size_bytes")
      .in("id", input.attachmentIds);

    if (
      !attachments ||
      attachments.length !== new Set(input.attachmentIds).size
    ) {
      return { ok: false, error: "Neki od izabranih priloga ne postoji." };
    }

    const total = attachments.reduce((sum, row) => sum + row.size_bytes, 0);
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      return {
        ok: false,
        error: `Prilozi su preveliki (najviše ${Math.round(MAX_TOTAL_ATTACHMENT_BYTES / 1024 / 1024)} MB ukupno).`,
      };
    }
  }

  const { data: created, error } = await supabase
    .from("emails")
    .insert({
      contact_id: input.contactId,
      user_id: me.id,
      to_email: contact.email,
      cc,
      bcc,
      subject,
      body,
      attachment_ids: input.attachmentIds,
      status: "scheduled",
      ...(scheduledAt && { scheduled_at: scheduledAt }),
    })
    .select()
    .single();

  if (error || !created) {
    return { ok: false, error: "Greška pri pripremi mejla." };
  }

  if (scheduledAt) {
    revalidateEmailPaths(input.contactId);
    return {
      ok: true,
      message: `Mejl je zakazan za ${new Date(scheduledAt).toLocaleString("sr-RS")}.`,
    };
  }

  // Slanje odmah ide kroz isti put kao cron: prvo preuzmi red, pa pošalji
  const claimed = await claimEmail(supabase, created.id);

  // Preuzimanje ne uspeva samo ako je cron stigao prvi (red je upravo
  // napravljen, pa otkazivanje nije moguće) — mejl će svejedno biti poslat
  if (!claimed) {
    revalidateEmailPaths(input.contactId);
    return { ok: true, message: "Mejl je preuzet za slanje." };
  }

  const result = await sendClaimedEmail(supabase, claimed);
  revalidateEmailPaths(input.contactId);

  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, message: "Mejl je poslat i evidentiran." };
}

export async function cancelScheduledEmail(
  emailId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(emailId)) return { ok: false, error: "Nepoznat mejl." };

  const supabase = createClient();

  // Uslovni update: ako je cron već preuzeo mejl, ovde se ne menja ništa
  let query = supabase
    .from("emails")
    .update({ status: "cancelled" })
    .eq("id", emailId)
    .eq("status", "scheduled");

  if (me.role !== "admin") {
    query = query.eq("user_id", me.id);
  }

  const { data } = await query.select("id, contact_id");

  if (!data || data.length === 0) {
    return { ok: false, error: "Mejl je u međuvremenu poslat ili otkazan." };
  }

  revalidatePath("/mejlovi");
  if (data[0].contact_id) revalidatePath(`/contacts/${data[0].contact_id}`);

  return { ok: true, message: "Zakazani mejl je otkazan." };
}

export async function disconnectGmail(): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const supabase = createClient();

  const { data: token } = await supabase
    .from("google_tokens")
    .select("id, refresh_token_enc")
    .eq("user_id", me.id)
    .maybeSingle();

  if (!token) return { ok: true, message: "Gmail nalog nije bio povezan." };

  const { error } = await supabase
    .from("google_tokens")
    .delete()
    .eq("id", token.id);

  if (error) return { ok: false, error: "Greška pri prekidanju veze." };

  // Best effort: token se poništava i kod Google-a
  try {
    await revokeRefreshToken(decryptSecret(token.refresh_token_enc));
  } catch {
    // Ako dešifrovanje ili poziv padnu, red je već obrisan
  }

  revalidatePath("/mejlovi");
  return { ok: true, message: "Gmail nalog je odvojen." };
}
