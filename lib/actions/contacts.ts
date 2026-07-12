"use server";

import { COMMUNICATION_STATUSES, INTEREST_TAGS } from "@/lib/constants";
import { setContactStatus } from "@/lib/contact-status";
import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId, isOneOf, normalizeEmail } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

export type ContactInput = {
  first_name: string;
  last_name: string;
  company?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  city?: string;
  notes?: string;
};

type ContactRowInput = {
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  notes: string | null;
};

type ParsedContact =
  | { ok: true; row: ContactRowInput }
  | { ok: false; error: string };

function parseContactInput(input: ContactInput): ParsedContact {
  const first_name = cleanText(input.first_name, 100);
  const last_name = cleanText(input.last_name, 100);
  if (!first_name || !last_name) {
    return { ok: false, error: "Ime i prezime su obavezni." };
  }

  const rawEmail = cleanText(input.email, 200);
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (rawEmail && !email) {
    return { ok: false, error: "Email adresa nije ispravna." };
  }

  return {
    ok: true,
    row: {
      first_name,
      last_name,
      company: cleanText(input.company, 300),
      job_title: cleanText(input.job_title, 200),
      email,
      phone: cleanText(input.phone, 50),
      mobile_phone: cleanText(input.mobile_phone, 50),
      city: cleanText(input.city, 100),
      notes: cleanText(input.notes, 2000),
    },
  };
}

function revalidateContactPaths(contactId?: number) {
  revalidatePath("/contacts");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");
}

export async function createContact(
  input: ContactInput,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const parsed = parseContactInput(input);
  if (!parsed.ok) return parsed;

  const supabase = createClient();
  const { error } = await supabase.from("contacts").insert(parsed.row);

  if (error) return { ok: false, error: "Greška pri dodavanju kontakta." };

  revalidateContactPaths();
  return { ok: true, message: "Kontakt je dodat." };
}

export async function updateContact(
  contactId: number,
  input: ContactInput,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const parsed = parseContactInput(input);
  if (!parsed.ok) return parsed;

  const supabase = createClient();
  const { error } = await supabase
    .from("contacts")
    .update(parsed.row)
    .eq("id", contactId);

  if (error) return { ok: false, error: "Greška pri izmeni kontakta." };

  revalidateContactPaths(contactId);
  return { ok: true, message: "Kontakt je izmenjen." };
}

export type ContactDeleteImpact =
  | { ok: true; interactions: number; assigned: boolean }
  | { ok: false; error: string };

// Read helper za dijalog brisanja: šta se sve briše zajedno sa kontaktom
export async function getContactDeleteImpact(
  contactId: number,
): Promise<ContactDeleteImpact> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const supabase = createClient();

  const [interactionsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId),
  ]);

  return {
    ok: true,
    interactions: interactionsRes.count ?? 0,
    assigned: (assignmentsRes.count ?? 0) > 0,
  };
}

export async function deleteContact(
  contactId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const supabase = createClient();

  // Prvo deca (nema kaskadnog brisanja u šemi), pa sam kontakt
  for (const table of [
    "interactions",
    "assignments",
    "contact_status",
  ] as const) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("contact_id", contactId);

    if (error) return { ok: false, error: "Greška pri brisanju kontakta." };
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId);

  if (error) return { ok: false, error: "Greška pri brisanju kontakta." };

  revalidateContactPaths(contactId);
  return { ok: true, message: "Kontakt je obrisan." };
}

export async function updateContactStatus(
  contactId: number,
  status: string,
  interestTag: string | null,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };
  if (!isOneOf(status, COMMUNICATION_STATUSES)) {
    return { ok: false, error: "Nepoznat status." };
  }
  if (interestTag !== null && !isOneOf(interestTag, INTEREST_TAGS)) {
    return { ok: false, error: "Nepoznata oznaka." };
  }

  const supabase = createClient();
  const statusOk = await setContactStatus(
    supabase,
    contactId,
    { communication_status: status, interest_tag: interestTag },
    me.email,
  );

  if (!statusOk) return { ok: false, error: "Greška pri izmeni statusa." };

  revalidateContactPaths(contactId);
  return { ok: true, message: "Status je izmenjen." };
}
