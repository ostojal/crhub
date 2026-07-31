import "server-only";

import { ATTACHMENTS_BUCKET } from "@/lib/constants";
import { setContactStatus } from "@/lib/contact-status";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "./crypto";
import { GoogleAuthError, mintAccessToken, sendGmailMessage } from "./google";
import {
  extractInlineImages,
  htmlToText,
  looksLikeHtml,
  sanitizeEmailHtml,
  textToHtml,
} from "./html";
import { buildMimeMessage, type MimeAttachment } from "./mime";
import { applyPlaceholders } from "./placeholders";

type Client = SupabaseClient<Database>;

export type EmailRow = Database["public"]["Tables"]["emails"]["Row"];

// Koliko dugo red sme da stoji u "sending" pre nego što ga smatramo
// zaglavljenim (proces pukao usred slanja)
const STUCK_MINUTES = 10;

// Koliko mejlova jedan cron poziv obradi — drži izvršavanje daleko od
// timeouta serverless funkcije
const BATCH_SIZE = 10;

const MAX_ERROR_LENGTH = 500;

// Atomsko preuzimanje: uslovni UPDATE nad jednim redom. Ko prvi stigne dobija
// red, ostali (drugi cron poziv ili otkazivanje) dobijaju 0 redova. Time se
// mejl ne može poslati dvaput niti poslati posle otkazivanja.
export async function claimEmail(
  supabase: Client,
  emailId: number,
): Promise<EmailRow | null> {
  const { data } = await supabase
    .from("emails")
    .update({ status: "sending", claimed_at: new Date().toISOString() })
    .eq("id", emailId)
    .eq("status", "scheduled")
    .select()
    .maybeSingle();

  return data ?? null;
}

async function markFailed(
  supabase: Client,
  emailId: number,
  error: string,
): Promise<{ ok: false; error: string }> {
  await supabase
    .from("emails")
    .update({ status: "failed", error: error.slice(0, MAX_ERROR_LENGTH) })
    .eq("id", emailId);

  return { ok: false, error };
}

async function loadAttachments(
  supabase: Client,
  attachmentIds: number[],
): Promise<
  { ok: true; attachments: MimeAttachment[] } | { ok: false; error: string }
> {
  if (attachmentIds.length === 0) return { ok: true, attachments: [] };

  const { data: rows } = await supabase
    .from("attachment_templates")
    .select("id, name, storage_path, mime_type")
    .in("id", attachmentIds);

  if (!rows || rows.length !== attachmentIds.length) {
    return { ok: false, error: "Prilog je u međuvremenu obrisan." };
  }

  const attachments: MimeAttachment[] = [];
  for (const row of rows) {
    const { data: file } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .download(row.storage_path);

    if (!file) {
      return {
        ok: false,
        error: `Prilog „${row.name}” nije mogao da se učita.`,
      };
    }

    attachments.push({
      filename: row.name,
      mimeType: row.mime_type,
      content: new Uint8Array(await file.arrayBuffer()),
    });
  }

  return { ok: true, attachments };
}

// Mejl poslat iz aplikacije se evidentira isto kao ručno kontaktiranje, pa ga
// postojeća analitika (lib/analytics.ts) hvata bez ikakve izmene.
// Greške ovde ne obaraju slanje — mejl je već otišao.
async function logSentEmail(
  supabase: Client,
  email: EmailRow,
  subject: string,
  senderEmail: string,
): Promise<void> {
  if (!email.contact_id) return;

  await supabase.from("interactions").insert({
    contact_id: email.contact_id,
    user_id: email.user_id,
    type: "email",
    notes: `Poslat mejl: „${subject}”`,
  });

  const { data: current } = await supabase
    .from("contact_status")
    .select("communication_status")
    .eq("contact_id", email.contact_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Lestvica ide samo naviše — bolji ishodi ("Dobijen odgovor", "Prihvaćeno"…)
  // se ne vraćaju unazad:
  //   prazno / "Nije kontaktiran" → "Poslato"
  //   "Poslato" / "Poslati follow up" → "Poslat follow up"
  // Drugi mejl istom kontaktu jeste follow up, pa se evidentira sam od sebe.
  const status = current?.communication_status;

  const next =
    !status || status === "Nije kontaktiran"
      ? "Poslato"
      : status === "Poslato" || status === "Poslati follow up"
        ? "Poslat follow up"
        : null;

  if (next) {
    await setContactStatus(
      supabase,
      email.contact_id,
      { communication_status: next },
      senderEmail,
    );
  }
}

// Šalje red koji je već preuzet (status='sending'). Isti put koriste i
// trenutno slanje iz kompozera i cron za zakazane mejlove.
// Nikad ne baca: neočekivana greška (npr. mreža) bi inače ostavila red
// zaglavljen u "sending" do sledećeg čišćenja.
export async function sendClaimedEmail(
  supabase: Client,
  email: EmailRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await send(supabase, email);
  } catch {
    return markFailed(supabase, email.id, "Neočekivana greška pri slanju.");
  }
}

async function send(
  supabase: Client,
  email: EmailRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [{ data: token }, { data: sender }] = await Promise.all([
    supabase
      .from("google_tokens")
      .select("id, google_email, refresh_token_enc, status")
      .eq("user_id", email.user_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("full_name, email")
      .eq("id", email.user_id)
      .maybeSingle(),
  ]);

  if (!token) {
    return markFailed(supabase, email.id, "Gmail nalog nije povezan.");
  }
  if (token.status === "broken") {
    return markFailed(
      supabase,
      email.id,
      "Gmail veza je prekinuta — poveži nalog ponovo na stranici Mejlovi.",
    );
  }

  let accessToken: string;
  try {
    accessToken = await mintAccessToken(decryptSecret(token.refresh_token_enc));
  } catch (error) {
    if (error instanceof GoogleAuthError && error.code === "invalid_grant") {
      await supabase
        .from("google_tokens")
        .update({ status: "broken", updated_at: new Date().toISOString() })
        .eq("id", token.id);

      return markFailed(
        supabase,
        email.id,
        "Gmail veza je istekla — poveži nalog ponovo na stranici Mejlovi.",
      );
    }

    return markFailed(supabase, email.id, "Neuspešna prijava na Gmail.");
  }

  const senderData = {
    full_name: sender?.full_name ?? null,
    email: sender?.email ?? token.google_email,
  };

  // Zaštitna mreža: ako je u tekstu ostao {{placeholder}} (npr. iz šablona
  // koji korisnik nije pregledao), zamenjuje se pre slanja
  let subject = email.subject;
  let body = email.body;

  if (email.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("first_name, last_name, company, job_title, city")
      .eq("id", email.contact_id)
      .maybeSingle();

    if (contact) {
      subject = applyPlaceholders(subject, contact, senderData);
      body = applyPlaceholders(body, contact, senderData);
    }
  }

  const attachments = await loadAttachments(supabase, email.attachment_ids);
  if (!attachments.ok) {
    return markFailed(supabase, email.id, attachments.error);
  }

  // Telo je HTML (formatiran tekst, slike); stariji zapisi su čist tekst i
  // konvertuju se ovde. Nalepljene slike (data: URL) postaju cid: delovi.
  const { html, images } = extractInlineImages(
    looksLikeHtml(body) ? sanitizeEmailHtml(body) : textToHtml(body),
  );

  const mime = buildMimeMessage({
    from: token.google_email,
    // Bez ovoga primalac u sandučetu vidi samo golu adresu
    fromName: senderData.full_name,
    to: email.to_email,
    cc: email.cc,
    bcc: email.bcc,
    subject,
    bodyText: htmlToText(html),
    bodyHtml: html,
    inlineImages: images,
    attachments: attachments.attachments,
  });

  const result = await sendGmailMessage(accessToken, mime);
  if (!result.ok) {
    return markFailed(supabase, email.id, result.error);
  }

  await supabase
    .from("emails")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      gmail_message_id: result.messageId,
      error: null,
    })
    .eq("id", email.id);

  await logSentEmail(supabase, email, subject, senderData.email);

  return { ok: true };
}

export type ProcessResult = {
  sent: number;
  failed: number;
  skipped: number;
  swept: number;
  // Popunjeno samo kad ni upit ne prođe (npr. tabele još nisu napravljene);
  // vidi se u net._http_response, pa se cron ne pravi da radi kad ne radi
  error?: string;
};

// Ulazna tačka za cron: pokupi dospele zakazane mejlove i pošalji ih
export async function processDueEmails(): Promise<ProcessResult> {
  const supabase = createClient();

  const stuckCutoff = new Date(
    Date.now() - STUCK_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: swept } = await supabase
    .from("emails")
    .update({
      status: "failed",
      error: "Slanje je prekinuto pre nego što se završilo.",
    })
    .eq("status", "sending")
    .lt("claimed_at", stuckCutoff)
    .select("id");

  const { data: due, error: dueError } = await supabase
    .from("emails")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (dueError) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      swept: swept?.length ?? 0,
      error: dueError.message,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of due ?? []) {
    const claimed = await claimEmail(supabase, row.id);
    // Otkazan ili preuzet od paralelnog poziva u međuvremenu
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const result = await sendClaimedEmail(supabase, claimed);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed, skipped, swept: swept?.length ?? 0 };
}
