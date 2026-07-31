import "server-only";

import { setContactStatus } from "@/lib/contact-status";
import type { CurrentUser } from "@/lib/dal";
import type { CommunicationStatus, Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

// Ista zaštita od neograničenog čitanja kao u lib/analytics.ts
const ROW_LIMIT = 5000;

// Mejlovi se ne šalju petkom, subotom ni nedeljom, pa se ti dani ne broje u
// "3 dana do follow up-a". Ostaju ponedeljak–četvrtak (1–4 po ISO danima).
const SEND_WEEKDAYS = new Set([1, 2, 3, 4]);

// Tim radi po beogradskom vremenu, a server po UTC-u; bez ovoga bi mejl
// poslat u 23:30 pao u pogrešan dan
const TZ = "Europe/Belgrade";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "2026-07-30" — kalendarski datum u Beogradu. Dalji račun ide nad ovakvim
// stringovima, čime otpada sva aritmetika sa pomeranjem sata i letnjim
// računanjem vremena.
export function belgradeDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

function isoWeekday(day: string): number {
  // Ponoć UTC nad čistim datumom — nema pomeranja koje bi promenilo dan
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

// N-ti radni dan posle zadatog datuma. Sam datum se ne broji, pa mejl poslat
// u utorak sa 3 dana dospeva u ponedeljak (sreda, četvrtak, ponedeljak).
export function addWorkingDays(day: string, count: number): string {
  const cursor = new Date(`${day}T00:00:00Z`);
  let remaining = count;

  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (SEND_WEEKDAYS.has(isoWeekday(cursor.toISOString().slice(0, 10)))) {
      remaining -= 1;
    }
  }

  return cursor.toISOString().slice(0, 10);
}

// Da li je od poslednjeg kontaktiranja prošlo dovoljno radnih dana
export function isDue(lastAt: string, days: number, now = new Date()): boolean {
  return addWorkingDays(belgradeDate(lastAt), days) <= belgradeDate(now);
}

// Koliko je radnih dana prošlo — služi samo za prikaz ("poslat pre 3 radna dana")
export function workingDaysSince(lastAt: string, now = new Date()): number {
  const today = belgradeDate(now);
  const cursor = new Date(`${belgradeDate(lastAt)}T00:00:00Z`);
  let count = 0;

  for (;;) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.toISOString().slice(0, 10);
    if (day > today) return count;
    if (SEND_WEEKDAYS.has(isoWeekday(day))) count += 1;
  }
}

export type FollowUpSettings = {
  followUpEnabled: boolean;
  followUpDays: number;
  callReminderEnabled: boolean;
  callReminderDays: number;
};

export const DEFAULT_FOLLOW_UP_SETTINGS: FollowUpSettings = {
  followUpEnabled: true,
  followUpDays: 3,
  callReminderEnabled: true,
  callReminderDays: 3,
};

// Ako tabela još nije napravljena (db/follow-up.sql nije pokrenut), vraćaju se
// podrazumevane vrednosti umesto da stranica pukne
export async function getFollowUpSettings(
  supabase: Client = createClient(),
): Promise<FollowUpSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select(
      "follow_up_enabled, follow_up_days, call_reminder_enabled, call_reminder_days",
    )
    .limit(1)
    .maybeSingle();

  if (!data) return DEFAULT_FOLLOW_UP_SETTINGS;

  return {
    followUpEnabled: data.follow_up_enabled,
    followUpDays: data.follow_up_days,
    callReminderEnabled: data.call_reminder_enabled,
    callReminderDays: data.call_reminder_days,
  };
}

export type FollowUpItem = {
  contactId: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  lastContactAt: string;
  workingDaysAgo: number;
};

export type FollowUpQueue = {
  followUp: FollowUpItem[];
  call: FollowUpItem[];
};

type ContactData = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  contact_status: {
    communication_status: CommunicationStatus | null;
    updated_at: string;
  }[];
};

type LastContact = {
  contact_id: number;
  lastAt: string;
  status: CommunicationStatus | null;
  contact: ContactData;
};

const CONTACT_SELECT =
  "contacts(id, first_name, last_name, company, email, phone, contact_status(communication_status, updated_at))";

// Ručno evidentirana kontaktiranja ulaze u follow up tek od uvođenja
// podsetnika. Starija istorija se namerno ne budi — inače bi svima odjednom
// iskočile desetine kontakata kontaktiranih pre nego što je tok uopšte
// postojao. Mejlovi poslati iz aplikacije nemaju ovo ograničenje.
const MANUAL_ANCHOR_SINCE = "2026-07-31T00:00:00+02:00";

function newestStatus(contact: ContactData): CommunicationStatus | null {
  const statuses = contact.contact_status ?? [];
  const newest = [...statuses].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  )[0];

  return newest?.communication_status ?? null;
}

// Poslednje kontaktiranje po kontaktu: mejl poslat iz aplikacije ili ručno
// evidentirano kontaktiranje (od MANUAL_ANCHOR_SINCE naovamo), šta je novije.
// userId izostavljen = svi korisnici (koristi ga cron).
async function loadLastContacts(
  supabase: Client,
  userId?: number,
): Promise<LastContact[]> {
  const emails = supabase
    .from("emails")
    .select(`contact_id, sent_at, ${CONTACT_SELECT}`)
    .eq("status", "sent")
    .not("contact_id", "is", null)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(ROW_LIMIT);

  const interactions = supabase
    .from("interactions")
    .select(`contact_id, created_at, ${CONTACT_SELECT}`)
    .not("contact_id", "is", null)
    .gte("created_at", MANUAL_ANCHOR_SINCE)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (userId !== undefined) {
    emails.eq("user_id", userId);
    interactions.eq("user_id", userId);
  }

  const [emailsRes, interactionsRes] = await Promise.all([
    emails,
    interactions,
  ]);

  const byContact = new Map<number, LastContact>();

  const consider = (
    contactId: number | null,
    at: string | null,
    contact: ContactData | null,
  ) => {
    if (contactId === null || !at || !contact) return;

    const existing = byContact.get(contactId);
    if (existing && existing.lastAt >= at) return;

    byContact.set(contactId, {
      contact_id: contactId,
      lastAt: at,
      status: newestStatus(contact),
      contact,
    });
  };

  for (const row of emailsRes.data ?? []) {
    consider(row.contact_id, row.sent_at, row.contacts);
  }
  for (const row of interactionsRes.data ?? []) {
    consider(row.contact_id, row.created_at, row.contacts);
  }

  return [...byContact.values()];
}

function toItem(row: LastContact): FollowUpItem {
  return {
    contactId: row.contact_id,
    name:
      [row.contact.first_name, row.contact.last_name]
        .filter(Boolean)
        .join(" ") || "—",
    company: row.contact.company || null,
    email: row.contact.email || null,
    phone: row.contact.phone || null,
    lastContactAt: row.lastAt,
    workingDaysAgo: workingDaysSince(row.lastAt),
  };
}

// Kontakti koje je ovaj korisnik kontaktirao, a koji čekaju sledeći korak.
// Vlasništvo ide po tome ko je kontaktirao, ne po dodeli — stranica /mejlovi
// prikazuje rad tog korisnika, pa isto pravilo važi i za admina.
export async function getFollowUpQueue(
  me: CurrentUser,
): Promise<FollowUpQueue> {
  const supabase = createClient();

  const [settings, rows] = await Promise.all([
    getFollowUpSettings(supabase),
    loadLastContacts(supabase, me.id),
  ]);

  if (!settings.followUpEnabled && !settings.callReminderEnabled) {
    return { followUp: [], call: [] };
  }

  const followUp: LastContact[] = [];
  const callCandidates: LastContact[] = [];

  for (const row of rows) {
    // "Poslato" uz dospeli rok je zaštita ako cron kasni — sekcija je tačna i
    // pre nego što status bude upisan
    if (
      settings.followUpEnabled &&
      (row.status === "Poslati follow up" ||
        (row.status === "Poslato" && isDue(row.lastAt, settings.followUpDays)))
    ) {
      followUp.push(row);
      continue;
    }

    if (
      settings.callReminderEnabled &&
      row.status === "Poslat follow up" &&
      isDue(row.lastAt, settings.callReminderDays)
    ) {
      callCandidates.push(row);
    }
  }

  // Podsetnik za poziv otpada čim je poziv evidentiran posle follow up-a
  const called = await findCalledSince(supabase, me.id, callCandidates);

  const byOldest = (a: LastContact, b: LastContact) =>
    a.lastAt.localeCompare(b.lastAt);

  return {
    followUp: followUp.sort(byOldest).map(toItem),
    call: callCandidates
      .filter((row) => !called.has(row.contact_id))
      .sort(byOldest)
      .map(toItem),
  };
}

async function findCalledSince(
  supabase: Client,
  userId: number,
  rows: LastContact[],
): Promise<Set<number>> {
  if (rows.length === 0) return new Set();

  const oldest = rows.reduce(
    (min, row) => (row.lastAt < min ? row.lastAt : min),
    rows[0].lastAt,
  );

  const { data } = await supabase
    .from("interactions")
    .select("contact_id, created_at")
    .eq("user_id", userId)
    .eq("type", "poziv")
    .in(
      "contact_id",
      rows.map((row) => row.contact_id),
    )
    .gte("created_at", oldest);

  const lastAtByContact = new Map(
    rows.map((row) => [row.contact_id, row.lastAt]),
  );

  const called = new Set<number>();
  for (const call of data ?? []) {
    if (call.contact_id === null) continue;
    const lastAt = lastAtByContact.get(call.contact_id);
    if (lastAt && call.created_at >= lastAt) called.add(call.contact_id);
  }

  return called;
}

// Cron: kontaktima kojima je istekao rok upisuje "Poslati follow up".
// Posle upisa uslov (status = "Poslato") više ne važi, pa je operacija
// idempotentna i ne radi ništa pri sledećem prolazu.
export async function promoteDueFollowUps(): Promise<{ promoted: number }> {
  const supabase = createClient();

  const settings = await getFollowUpSettings(supabase);
  if (!settings.followUpEnabled) return { promoted: 0 };

  const rows = await loadLastContacts(supabase);

  let promoted = 0;
  for (const row of rows) {
    if (row.status !== "Poslato") continue;
    if (!isDue(row.lastAt, settings.followUpDays)) continue;

    const ok = await setContactStatus(
      supabase,
      row.contact_id,
      { communication_status: "Poslati follow up" },
      "sistem",
    );

    if (ok) promoted += 1;
  }

  return { promoted };
}
