import { EmailsList, type EmailListItem } from "@/components/email/emails-list";
import { GmailConnectionCard } from "@/components/email/gmail-connection-card";
import { SignatureCard } from "@/components/email/signature-card";
import type { EmailStatus } from "@/lib/constants";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

const EMAIL_LIMIT = 100;

export default async function EmailsPage() {
  const me = await requireRole("admin", "user");

  const supabase = createClient();

  const [{ data: connection }, { data: profile }, { data: emails, error }] =
    await Promise.all([
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
        .from("emails")
        .select(
          "id, contact_id, to_email, subject, status, scheduled_at, sent_at, error, contacts(first_name, last_name)",
        )
        .eq("user_id", me.id)
        .order("created_at", { ascending: false })
        .limit(EMAIL_LIMIT),
    ]);

  const items: EmailListItem[] = (emails ?? []).map((email) => ({
    id: email.id,
    contact_id: email.contact_id,
    to_email: email.to_email,
    subject: email.subject,
    status: email.status as EmailStatus,
    scheduled_at: email.scheduled_at,
    sent_at: email.sent_at,
    error: email.error,
    contactName:
      [email.contacts?.first_name, email.contacts?.last_name]
        .filter(Boolean)
        .join(" ") || null,
  }));

  // Zakazani idu na vrh (najbliži prvi) — to je jedino što se još može menjati
  const sorted = [
    ...items
      .filter((email) => email.status === "scheduled")
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    ...items.filter((email) => email.status !== "scheduled"),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Mejlovi</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Mejlovi koje si poslao ili zakazao iz aplikacije.
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={null}>
          <GmailConnectionCard connection={connection ?? null} />
        </Suspense>
        <SignatureCard signature={profile?.email_signature ?? null} />
      </div>

      {error ? (
        <p className="text-sm text-red-500">
          Greška pri učitavanju mejlova: {error.message}
        </p>
      ) : (
        <EmailsList emails={sorted} />
      )}
    </div>
  );
}
