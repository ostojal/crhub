import "server-only";

import type {
  CommunicationStatus,
  Database,
  InterestTag,
} from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusPatch = {
  communication_status?: CommunicationStatus;
  interest_tag?: InterestTag | null;
};

// Logički jedan red statusa po kontaktu i projektu: ako red postoji, menja se
// najnoviji; inače se ubacuje novi. Sva čitanja tretiraju najnoviji red kao
// aktuelan. Isti kontakt ima odvojen status na svakom projektu — na DigiHack-u
// može biti "Prihvaćeno", a na GreenTour-u "Nije kontaktiran".
export async function setContactStatus(
  supabase: SupabaseClient<Database>,
  projectId: number,
  contactId: number,
  patch: StatusPatch,
  updatedBy: string,
): Promise<boolean> {
  if (
    patch.communication_status === undefined &&
    patch.interest_tag === undefined
  ) {
    return true;
  }

  const { data: existing } = await supabase
    .from("contact_status")
    .select("id")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("contact_status")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq("id", existing.id);

    return !error;
  }

  const { error } = await supabase.from("contact_status").insert({
    project_id: projectId,
    contact_id: contactId,
    communication_status: patch.communication_status ?? null,
    interest_tag: patch.interest_tag ?? null,
    updated_by: updatedBy,
  });

  return !error;
}

export type ContactStatusRow = {
  communication_status: CommunicationStatus | null;
  interest_tag: InterestTag | null;
  updated_at: string;
};

// Aktuelan status za spisak kontakata, u jednom upitu. Koriste ga mesta gde
// bi status inače stigao kroz dvostruko ugnežđen select (kontakt unutar
// dodele ili unutar mejla) — PostgREST tamo traži filter po punoj putanji,
// pa je odvojen upit i jasniji i sigurniji.
export async function getContactStatuses(
  supabase: SupabaseClient<Database>,
  projectId: number,
  contactIds: number[],
): Promise<Map<number, ContactStatusRow>> {
  const byContact = new Map<number, ContactStatusRow>();
  if (contactIds.length === 0) return byContact;

  const { data } = await supabase
    .from("contact_status")
    .select("contact_id, communication_status, interest_tag, updated_at")
    .eq("project_id", projectId)
    .in("contact_id", [...new Set(contactIds)])
    .order("updated_at", { ascending: false });

  // Redovi stižu opadajuće po updated_at, pa je prvi viđeni za kontakt
  // ujedno i aktuelan
  for (const row of data ?? []) {
    if (row.contact_id === null || byContact.has(row.contact_id)) continue;
    byContact.set(row.contact_id, {
      communication_status: row.communication_status,
      interest_tag: row.interest_tag,
      updated_at: row.updated_at,
    });
  }

  return byContact;
}
