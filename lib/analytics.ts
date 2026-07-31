import "server-only";

import {
  COMMUNICATION_STATUSES,
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  NO_CATEGORY_LABEL,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isOneOf } from "@/lib/validate";

// Agregacija se radi u JS nad redovima povučenim service klijentom; limit
// od 5000 redova po upitu je daleko iznad realnog obima baze (~250
// kontakata) i služi samo kao zaštita od neograničenog čitanja.
const ROW_LIMIT = 5000;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type CountItem = { label: string; count: number };

export type RecentInteraction = {
  id: number;
  type: string | null;
  notes: string | null;
  created_at: string;
  contactId: number | null;
  contactName: string;
  company: string | null;
};

export type UserStats = {
  assignedTotal: number;
  contactedCount: number;
  // Mejlovi poslati iz aplikacije i ručno evidentirana kontaktiranja stoje
  // odvojeno: zbir bi bio veći od broja kontakata i delovao kao greška
  sentEmails: number;
  manualLogs: number;
  last30Days: number;
  byType: CountItem[];
  byStatus: CountItem[];
  byCategory: CountItem[];
  recent: RecentInteraction[];
};

// Kontaktirani partneri razvrstani po kategoriji. Broje se RAZLIČITI kontakti
// kojima je poslat bar jedan mejl, ne redovi u tabeli mejlova — dva mejla
// istom partneru su i dalje jedan kontaktiran partner.
// userId izostavljen = ceo tim.
export async function getContactedByCategory(
  userId?: number,
): Promise<CountItem[]> {
  const supabase = createClient();

  const query = supabase
    .from("emails")
    .select("contact_id, contacts(category)")
    .eq("status", "sent")
    .not("contact_id", "is", null)
    .limit(ROW_LIMIT);

  if (userId !== undefined) query.eq("user_id", userId);

  const { data } = await query;

  const counts = new Map<string, number>();
  const seen = new Set<number>();
  for (const row of data ?? []) {
    if (row.contact_id === null || seen.has(row.contact_id)) continue;
    seen.add(row.contact_id);

    const category = row.contacts?.category;
    const label =
      category && isOneOf(category, CONTACT_CATEGORIES)
        ? CONTACT_CATEGORY_LABELS[category]
        : NO_CATEGORY_LABEL;

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  // Fiksan redosled kategorija, "bez kategorije" na kraju i samo ako postoji
  const items: CountItem[] = CONTACT_CATEGORIES.map((category) => ({
    label: CONTACT_CATEGORY_LABELS[category],
    count: counts.get(CONTACT_CATEGORY_LABELS[category]) ?? 0,
  }));

  const uncategorized = counts.get(NO_CATEGORY_LABEL) ?? 0;
  if (uncategorized > 0) {
    items.push({ label: NO_CATEGORY_LABEL, count: uncategorized });
  }

  return items;
}

function interactionTypeLabel(type: string | null): string {
  if (type && isOneOf(type, INTERACTION_TYPES)) {
    return INTERACTION_TYPE_LABELS[type];
  }
  return type || "Nepoznato";
}

export async function getUserStats(userId: number): Promise<UserStats> {
  const supabase = createClient();

  const [
    assignedRes,
    interactionsRes,
    statusRes,
    recentRes,
    byCategory,
    sentRes,
    interactionsCountRes,
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("interactions")
      .select("contact_id, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
    supabase
      .from("assignments")
      .select("contacts(id, contact_status(communication_status, updated_at))")
      .eq("user_id", userId)
      .limit(ROW_LIMIT),
    supabase
      .from("interactions")
      .select(
        "id, type, notes, created_at, contacts(id, first_name, last_name, company)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    getContactedByCategory(userId),
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent"),
    // Pravi count, ne .length nad povučenim redovima — taj bi se tiho
    // zasitio na ROW_LIMIT
    supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const interactions = interactionsRes.data ?? [];

  const contacted = new Set<number>();
  const byTypeMap = new Map<string, number>();
  let last30Days = 0;
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  for (const interaction of interactions) {
    if (interaction.contact_id !== null) contacted.add(interaction.contact_id);

    const label = interactionTypeLabel(interaction.type);
    byTypeMap.set(label, (byTypeMap.get(label) ?? 0) + 1);

    if (new Date(interaction.created_at).getTime() >= cutoff) last30Days++;
  }

  // Fiksni redosled tipova iz konstanti, pa eventualni nepoznati tipovi
  const byType: CountItem[] = INTERACTION_TYPES.map((type) => ({
    label: INTERACTION_TYPE_LABELS[type],
    count: byTypeMap.get(INTERACTION_TYPE_LABELS[type]) ?? 0,
  }));
  for (const [label, count] of byTypeMap) {
    if (!byType.some((item) => item.label === label)) {
      byType.push({ label, count });
    }
  }

  const byStatusMap = new Map<string, number>();
  for (const row of statusRes.data ?? []) {
    const statuses = row.contacts?.contact_status ?? [];
    const newest = [...statuses].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    )[0];
    const status = newest?.communication_status ?? "Nije kontaktiran";
    byStatusMap.set(status, (byStatusMap.get(status) ?? 0) + 1);
  }

  const byStatus: CountItem[] = COMMUNICATION_STATUSES.map((status) => ({
    label: status,
    count: byStatusMap.get(status) ?? 0,
  }));

  const recent: RecentInteraction[] = (recentRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    notes: row.notes,
    created_at: row.created_at,
    contactId: row.contacts?.id ?? null,
    contactName:
      [row.contacts?.first_name, row.contacts?.last_name]
        .filter(Boolean)
        .join(" ") || "—",
    company: row.contacts?.company ?? null,
  }));

  // Interakcije nemaju kolonu koja razdvaja automatski upis (slanje mejla) od
  // ručnog evidentiranja, pa se ručni dobijaju oduzimanjem
  const sentEmails = sentRes.count ?? 0;
  const interactionsTotal = interactionsCountRes.count ?? interactions.length;

  return {
    assignedTotal: assignedRes.count ?? 0,
    contactedCount: contacted.size,
    sentEmails,
    manualLogs: Math.max(0, interactionsTotal - sentEmails),
    last30Days,
    byType,
    byStatus,
    byCategory,
    recent,
  };
}

export type UserSummaryRow = {
  userId: number;
  name: string;
  assigned: number;
  contacted: number;
  interactions: number;
  lastActivity: string | null;
};

export async function getUsersSummary(): Promise<UserSummaryRow[]> {
  const supabase = createClient();

  const [usersRes, assignmentsRes, interactionsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email")
      .eq("role", "user")
      .order("full_name", { ascending: true }),
    supabase.from("assignments").select("user_id").limit(ROW_LIMIT),
    supabase
      .from("interactions")
      .select("user_id, contact_id, created_at")
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
  ]);

  const assignedByUser = new Map<number, number>();
  for (const row of assignmentsRes.data ?? []) {
    if (row.user_id === null) continue;
    assignedByUser.set(row.user_id, (assignedByUser.get(row.user_id) ?? 0) + 1);
  }

  const interactionsByUser = new Map<number, number>();
  const contactedByUser = new Map<number, Set<number>>();
  const lastActivityByUser = new Map<number, string>();
  for (const row of interactionsRes.data ?? []) {
    if (row.user_id === null) continue;

    interactionsByUser.set(
      row.user_id,
      (interactionsByUser.get(row.user_id) ?? 0) + 1,
    );

    if (row.contact_id !== null) {
      const set = contactedByUser.get(row.user_id) ?? new Set<number>();
      set.add(row.contact_id);
      contactedByUser.set(row.user_id, set);
    }

    // Redovi stižu sortirani opadajuće, prvi viđeni je poslednja aktivnost
    if (!lastActivityByUser.has(row.user_id)) {
      lastActivityByUser.set(row.user_id, row.created_at);
    }
  }

  return (usersRes.data ?? []).map((user) => ({
    userId: user.id,
    name: user.full_name || user.email || `Korisnik #${user.id}`,
    assigned: assignedByUser.get(user.id) ?? 0,
    contacted: contactedByUser.get(user.id)?.size ?? 0,
    interactions: interactionsByUser.get(user.id) ?? 0,
    lastActivity: lastActivityByUser.get(user.id) ?? null,
  }));
}
