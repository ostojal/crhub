"use server";

import {
  MAX_BODY_CHARS,
  MAX_SCHEDULE_DAYS,
  MAX_SIGNATURE_CHARS,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/constants";
import { checkRole, type CurrentUser } from "@/lib/dal";
import type { Database } from "@/lib/database.types";
import { decryptSecret } from "@/lib/email/crypto";
import { revokeRefreshToken } from "@/lib/email/google";
import { isEmptyHtml, sanitizeEmailHtml } from "@/lib/email/html";
import { claimEmail, sendClaimedEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId, normalizeEmail } from "@/lib/validate";
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
      // Podaci pošiljaoca za placeholdere {{moje_ime}} i slično
      sender: { full_name: string | null; email: string };
      signature: string | null;
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

  const [contactRes, tokenRes, meRes, templatesRes, ccRes, attachmentsRes] =
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
        .from("users")
        .select("email_signature")
        .eq("id", me.id)
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
    sender: { full_name: me.fullName, email: me.email },
    signature: meRes.data?.email_signature ?? null,
    contact: contactRes.data,
    templates: templatesRes.data ?? [],
    ccOptions: ccRes.data ?? [],
    attachments: attachmentsRes.data ?? [],
  };
}

export type ComposeEmailInput = {
  contactId: number;
  // Adresa primaoca; prazno znači „adresa sa kontakta"
  to?: string;
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

type ParsedEmail =
  | {
      ok: true;
      subject: string;
      body: string;
      // null = pošiljalac nije menjao primaoca, uzima se adresa sa kontakta
      to: string | null;
      cc: string[];
      bcc: string[];
      scheduledAt: string | null;
    }
  | { ok: false; error: string };

// Zajedničke provere sadržaja za slanje i za izmenu zakazanog mejla
async function parseEmailContent(
  supabase: Client,
  input: Omit<ComposeEmailInput, "contactId">,
): Promise<ParsedEmail> {
  if (
    !isIdList(input.cc, MAX_RECIPIENTS) ||
    !isIdList(input.bcc, MAX_RECIPIENTS)
  ) {
    return { ok: false, error: "Neispravan izbor CC/BCC adresa." };
  }
  if (!isIdList(input.attachmentIds, MAX_ATTACHMENTS)) {
    return { ok: false, error: "Neispravan izbor priloga." };
  }

  // Primalac je izmenjiv u kompozeru, pa se adresa proverava kao unos
  const rawTo = cleanText(input.to, 200);
  const to = rawTo ? normalizeEmail(rawTo) : null;
  if (rawTo && !to) {
    return { ok: false, error: "Email adresa primaoca nije ispravna." };
  }

  const subject = cleanText(input.subject, 300);
  if (!subject) return { ok: false, error: "Naslov je obavezan." };

  // Telo je HTML iz editora — ne skraćuje se (presečen tag bi pokvario
  // poruku), nego se prevelik mejl odbija
  if ((input.body ?? "").length > MAX_BODY_CHARS) {
    return {
      ok: false,
      error: "Mejl je prevelik. Smanji ili izbaci neku od slika u tekstu.",
    };
  }

  const body = sanitizeEmailHtml(input.body ?? "");
  if (isEmptyHtml(body)) return { ok: false, error: "Telo mejla je obavezno." };

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

  return { ok: true, subject, body, to, cc, bcc, scheduledAt };
}

export async function composeEmail(
  input: ComposeEmailInput,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(input.contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const supabase = createClient();
  if (!(await hasContactAccess(supabase, me, input.contactId))) {
    return { ok: false, error: NO_PERMISSION };
  }

  const parsed = await parseEmailContent(supabase, input);
  if (!parsed.ok) return parsed;

  const { subject, body, cc, bcc, scheduledAt } = parsed;

  const { data: contact } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", input.contactId)
    .maybeSingle();

  // Uneta adresa ima prednost nad onom iz baze; kontakt bez adrese se može
  // kontaktirati samo ako je pošiljalac upisao primaoca ručno
  const toEmail = parsed.to ?? contact?.email ?? null;
  if (!toEmail) {
    return { ok: false, error: "Unesi email adresu primaoca." };
  }

  const { data: created, error } = await supabase
    .from("emails")
    .insert({
      contact_id: input.contactId,
      user_id: me.id,
      to_email: toEmail,
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

export type EmailDetails =
  | {
      ok: true;
      email: {
        id: number;
        contactId: number | null;
        contactName: string | null;
        toEmail: string;
        cc: string[];
        bcc: string[];
        subject: string;
        body: string;
        status: string;
        scheduledAt: string;
        sentAt: string | null;
        error: string | null;
        attachments: { id: number; name: string; size_bytes: number }[];
        // Za ponovno popunjavanje kompozera pri izmeni zakazanog mejla
        ccIds: number[];
        bccIds: number[];
        attachmentIds: number[];
      };
    }
  | { ok: false; error: string };

// Pun sadržaj jednog mejla — za pregled poslatog i za izmenu zakazanog
export async function getEmailDetails(emailId: number): Promise<EmailDetails> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(emailId)) return { ok: false, error: "Nepoznat mejl." };

  const supabase = createClient();

  const { data: email } = await supabase
    .from("emails")
    .select(
      "id, user_id, contact_id, to_email, cc, bcc, subject, body, status, scheduled_at, sent_at, error, attachment_ids, contacts(first_name, last_name)",
    )
    .eq("id", emailId)
    .maybeSingle();

  if (!email) return { ok: false, error: "Mejl ne postoji." };
  if (me.role !== "admin" && email.user_id !== me.id) {
    return { ok: false, error: NO_PERMISSION };
  }

  const [{ data: options }, { data: attachments }] = await Promise.all([
    supabase.from("cc_bcc_options").select("id, email"),
    email.attachment_ids.length > 0
      ? supabase
          .from("attachment_templates")
          .select("id, name, size_bytes")
          .in("id", email.attachment_ids)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Adrese su snimljene kao tekst; za kompozer se vraćaju na id-jeve, a one
  // koje su u međuvremenu uklonjene sa liste jednostavno otpadaju
  const idsFor = (addresses: string[]) =>
    (options ?? [])
      .filter((option) => addresses.includes(option.email))
      .map((option) => option.id);

  return {
    ok: true,
    email: {
      id: email.id,
      contactId: email.contact_id,
      contactName:
        [email.contacts?.first_name, email.contacts?.last_name]
          .filter(Boolean)
          .join(" ") || null,
      toEmail: email.to_email,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduled_at,
      sentAt: email.sent_at,
      error: email.error,
      attachments: attachments ?? [],
      ccIds: idsFor(email.cc),
      bccIds: idsFor(email.bcc),
      attachmentIds: email.attachment_ids,
    },
  };
}

// Izmena mejla koji još čeka slanje. Uslovni UPDATE po statusu znači da
// izmena ne može da "stigne" mejl koji je cron već preuzeo.
export async function updateScheduledEmail(
  emailId: number,
  input: Omit<ComposeEmailInput, "contactId">,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(emailId)) return { ok: false, error: "Nepoznat mejl." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("emails")
    .select("id, user_id, contact_id, status")
    .eq("id", emailId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Mejl ne postoji." };
  if (me.role !== "admin" && existing.user_id !== me.id) {
    return { ok: false, error: NO_PERMISSION };
  }
  if (existing.status !== "scheduled") {
    return {
      ok: false,
      error: "Mejl više nije zakazan, pa se ne može menjati.",
    };
  }

  const parsed = await parseEmailContent(supabase, input);
  if (!parsed.ok) return parsed;

  const { error } = await supabase
    .from("emails")
    .update({
      subject: parsed.subject,
      body: parsed.body,
      cc: parsed.cc,
      bcc: parsed.bcc,
      attachment_ids: input.attachmentIds,
      ...(parsed.to && { to_email: parsed.to }),
      ...(parsed.scheduledAt && { scheduled_at: parsed.scheduledAt }),
    })
    .eq("id", emailId)
    .eq("status", "scheduled");

  if (error) return { ok: false, error: "Greška pri izmeni mejla." };

  revalidatePath("/mejlovi");
  if (existing.contact_id) revalidatePath(`/contacts/${existing.contact_id}`);

  return { ok: true, message: "Zakazani mejl je izmenjen." };
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

// Potpis se u kompozeru dodaje na kraj poruke, pa korisnik pre slanja vidi
// tačno ono što primalac dobija (i može da ga izmeni za taj mejl)
export async function updateEmailSignature(
  signature: string,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if ((signature ?? "").length > MAX_SIGNATURE_CHARS) {
    return { ok: false, error: "Potpis je prevelik." };
  }

  // Potpis je HTML; prazan potpis briše postojeći
  const clean = sanitizeEmailHtml(signature ?? "");
  const value = isEmptyHtml(clean) ? null : clean;

  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ email_signature: value })
    .eq("id", me.id);

  if (error) return { ok: false, error: "Greška pri čuvanju potpisa." };

  revalidatePath("/mejlovi");
  return { ok: true, message: "Potpis je sačuvan." };
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
