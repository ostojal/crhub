"use server";

import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";
const MAX_BULK = 25;

function revalidateAssignmentPaths() {
  revalidatePath("/contacts");
  revalidatePath("/moji-kontakti");
}

// Dodela sme da ide samo na naloge sa ulogom 'user'
async function isAssignableUser(
  supabase: ReturnType<typeof createClient>,
  userId: number,
): Promise<boolean> {
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  return user?.role === "user";
}

export async function assignContact(
  contactId: number,
  userId: number,
  overwrite: boolean,
): Promise<ActionResult> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId) || !isId(userId)) {
    return { ok: false, error: "Nepoznat kontakt ili korisnik." };
  }

  const supabase = createClient();

  if (!(await isAssignableUser(supabase, userId))) {
    return { ok: false, error: "Izabrani nalog nema ulogu korisnika." };
  }

  const { data: existing } = await supabase
    .from("assignments")
    .select("id, user_id")
    .eq("contact_id", contactId)
    .limit(1)
    .maybeSingle();

  if (existing?.user_id === userId) {
    return { ok: false, error: "Kontakt je već dodeljen ovom korisniku." };
  }

  if (existing && !overwrite) {
    return { ok: false, error: "Kontakt je već dodeljen drugom korisniku." };
  }

  // Jedan aktivan izvršilac po kontaktu: prebacivanje = brisanje pa upis
  if (existing) {
    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("contact_id", contactId);

    if (deleteError) return { ok: false, error: "Greška pri dodeli." };
  }

  const { error } = await supabase.from("assignments").insert({
    contact_id: contactId,
    user_id: userId,
    assigned_by: me.email,
  });

  if (error) return { ok: false, error: "Greška pri dodeli." };

  revalidateAssignmentPaths();
  return { ok: true, message: "Kontakt je dodeljen." };
}

export async function assignContacts(
  contactIds: number[],
  userId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (
    !Array.isArray(contactIds) ||
    contactIds.length === 0 ||
    contactIds.length > MAX_BULK ||
    !contactIds.every(isId) ||
    !isId(userId)
  ) {
    return { ok: false, error: "Neispravan izbor kontakata ili korisnika." };
  }

  const supabase = createClient();

  if (!(await isAssignableUser(supabase, userId))) {
    return { ok: false, error: "Izabrani nalog nema ulogu korisnika." };
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .in("contact_id", contactIds);

  if (deleteError) return { ok: false, error: "Greška pri dodeli." };

  const { error } = await supabase.from("assignments").insert(
    contactIds.map((contactId) => ({
      contact_id: contactId,
      user_id: userId,
      assigned_by: me.email,
    })),
  );

  if (error) return { ok: false, error: "Greška pri dodeli." };

  revalidateAssignmentPaths();
  return {
    ok: true,
    message: `Dodeljeno kontakata: ${contactIds.length}.`,
  };
}

export async function assignCompany(
  rawCompany: string,
  userId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const company = cleanText(rawCompany, 300);
  if (!company || !isId(userId)) {
    return { ok: false, error: "Neispravna kompanija ili korisnik." };
  }

  const supabase = createClient();

  if (!(await isAssignableUser(supabase, userId))) {
    return { ok: false, error: "Izabrani nalog nema ulogu korisnika." };
  }

  // Poklapanje po tačnom nazivu firme, kako stoji u koloni company
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id")
    .eq("company", company);

  if (contactsError) return { ok: false, error: "Greška pri dodeli." };
  if (!contacts?.length) {
    return { ok: false, error: "Kompanija nema nijedan kontakt." };
  }

  const contactIds = contacts.map((c) => c.id);

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .in("contact_id", contactIds);

  if (deleteError) return { ok: false, error: "Greška pri dodeli." };

  const { error } = await supabase.from("assignments").insert(
    contactIds.map((contactId) => ({
      contact_id: contactId,
      user_id: userId,
      assigned_by: me.email,
    })),
  );

  if (error) return { ok: false, error: "Greška pri dodeli." };

  revalidateAssignmentPaths();
  return {
    ok: true,
    message: `Dodeljeno kontakata firme ${company}: ${contactIds.length}.`,
  };
}

export async function unassignContacts(
  contactIds: number[],
): Promise<ActionResult> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (
    !Array.isArray(contactIds) ||
    contactIds.length === 0 ||
    contactIds.length > MAX_BULK ||
    !contactIds.every(isId)
  ) {
    return { ok: false, error: "Neispravan izbor kontakata." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("assignments")
    .delete()
    .in("contact_id", contactIds);

  if (error) return { ok: false, error: "Greška pri uklanjanju dodela." };

  revalidateAssignmentPaths();
  return { ok: true, message: "Dodele su uklonjene." };
}

export async function unassignContact(
  contactId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const supabase = createClient();
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("contact_id", contactId);

  if (error) return { ok: false, error: "Greška pri uklanjanju dodele." };

  revalidateAssignmentPaths();
  return { ok: true, message: "Dodela je uklonjena." };
}

export type CompanyAssignmentInfo =
  | { ok: true; total: number; assigned: number }
  | { ok: false; error: string };

// Read helper za dijalog dodele: koliko kontakata firma ima i koliko ih je
// već dodeljeno nekom korisniku
export async function getCompanyAssignmentInfo(
  rawCompany: string,
): Promise<CompanyAssignmentInfo> {
  const me = await checkRole("admin", "editor");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const company = cleanText(rawCompany, 300);
  if (!company) return { ok: false, error: "Neispravna kompanija." };

  const supabase = createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, assignments(id)")
    .eq("company", company);

  if (error) return { ok: false, error: "Greška pri čitanju firme." };

  const total = contacts?.length ?? 0;
  const assigned =
    contacts?.filter((c) => (c.assignments?.length ?? 0) > 0).length ?? 0;

  return { ok: true, total, assigned };
}
