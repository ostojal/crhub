import "server-only";

import { NOT_NOTE_FILTER } from "@/lib/constants";
import { setContactStatus } from "@/lib/contact-status";
import type { CommunicationStatus, Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

// Mejl koji je zakazan, a još nije otišao. Kontakt je već u statusu "Poslato",
// ali se u listama prikazuje kao "Zakazano" (components/status-badge.tsx).
export const PENDING_EMAIL_STATUSES = ["scheduled", "sending"] as const;

// Statusi koje zakazivanje i slanje mejla smeju da menjaju. Lestvica ide samo
// naviše — bolji ishodi ("Dobijen odgovor", "Prihvaćeno"…) se ne vraćaju
// unazad, pa se iz njih ne pomera ništa.
const OPEN_STATUSES = new Set<CommunicationStatus>([
  "Nije kontaktiran",
  "Poslato",
  "Poslati follow up",
  "Poslat follow up",
]);

async function currentStatus(
  supabase: Client,
  projectId: number,
  contactId: number,
): Promise<CommunicationStatus | null> {
  const { data } = await supabase
    .from("contact_status")
    .select("communication_status")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.communication_status ?? null;
}

// Status kontakta posle zakazivanja ili slanja mejla iz aplikacije. Sve se
// računa unutar jednog projekta.
//
// Da li je mejl prvi ili follow up ne sme da se čita iz statusa: ako je neko
// ručno upisao "Poslato" dok je mejl čekao slanje, samo slanje bi ispalo
// follow up i kontakt bi preskočio celo follow up stanje. Broje se stvarno
// poslati mejlovi tom kontaktu, bez ovog reda.
export async function advanceStatusForEmail(
  supabase: Client,
  projectId: number,
  contactId: number,
  emailId: number,
  actor: string,
): Promise<void> {
  const [status, { count: earlierSent }] = await Promise.all([
    currentStatus(supabase, projectId, contactId),
    // Mejlovi poslati na drugom projektu ne čine ovaj mejl follow up-om
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("contact_id", contactId)
      .eq("status", "sent")
      .neq("id", emailId),
  ]);

  if (status !== null && !OPEN_STATUSES.has(status)) return;

  // Drugi (i svaki naredni) mejl istom kontaktu jeste follow up
  const next: CommunicationStatus =
    (earlierSent ?? 0) > 0 || status === "Poslat follow up"
      ? "Poslat follow up"
      : "Poslato";

  if (next === status) return;

  await setContactStatus(
    supabase,
    projectId,
    contactId,
    { communication_status: next },
    actor,
  );
}

// Otkazivanje zakazanog mejla vraća status samo ako od kontaktiranja nije
// ostalo ništa: nema drugog zakazanog ni poslatog mejla, nema evidentiranog
// kontaktiranja. Inače status pripada nečem drugom i ne dira se.
export async function revertStatusAfterCancel(
  supabase: Client,
  projectId: number,
  contactId: number,
  actor: string,
): Promise<void> {
  const status = await currentStatus(supabase, projectId, contactId);
  if (status !== "Poslato" && status !== "Poslat follow up") return;

  const [{ count: emails }, { count: contacted }] = await Promise.all([
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("contact_id", contactId)
      .in("status", [...PENDING_EMAIL_STATUSES, "sent"]),
    supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("contact_id", contactId)
      .or(NOT_NOTE_FILTER),
  ]);

  if ((emails ?? 0) > 0 || (contacted ?? 0) > 0) return;

  await setContactStatus(
    supabase,
    projectId,
    contactId,
    { communication_status: "Nije kontaktiran" },
    actor,
  );
}

// Kontakti sa mejlom koji čeka slanje — za prikaz "Zakazano" u listama.
// Prazan spisak id-jeva ne ide u bazu.
export async function getPendingEmailContactIds(
  supabase: Client,
  projectId: number,
  contactIds: number[],
): Promise<Set<number>> {
  if (contactIds.length === 0) return new Set();

  const { data } = await supabase
    .from("emails")
    .select("contact_id")
    .eq("project_id", projectId)
    .in("contact_id", contactIds)
    .in("status", [...PENDING_EMAIL_STATUSES]);

  const pending = new Set<number>();
  for (const row of data ?? []) {
    if (row.contact_id !== null) pending.add(row.contact_id);
  }

  return pending;
}
