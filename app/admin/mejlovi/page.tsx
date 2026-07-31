import { AttachmentTemplatesSection } from "@/components/admin/attachment-templates-section";
import { CcBccSection } from "@/components/admin/cc-bcc-section";
import { EmailTemplatesSection } from "@/components/admin/email-templates-section";
import { FollowUpSettingsSection } from "@/components/admin/follow-up-settings-section";
import { requireRole } from "@/lib/dal";
import { getFollowUpSettings } from "@/lib/follow-up";
import { createClient } from "@/lib/supabase/server";

export default async function AdminEmailsPage() {
  await requireRole("admin");

  const supabase = createClient();

  const [templatesRes, attachmentsRes, ccRes, followUpSettings] =
    await Promise.all([
      supabase
        .from("email_templates")
        .select("id, name, subject, body")
        .order("name", { ascending: true }),
      supabase
        .from("attachment_templates")
        .select("id, name, size_bytes, mime_type")
        .order("name", { ascending: true }),
      supabase
        .from("cc_bcc_options")
        .select("id, email, label")
        .order("email", { ascending: true }),
      getFollowUpSettings(supabase),
    ]);

  const error =
    templatesRes.error ?? attachmentsRes.error ?? ccRes.error ?? null;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju podataka: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        Mejl šabloni
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Šabloni, prilozi, CC/BCC adrese i podsetnici za follow up koje tim
        koristi pri slanju mejlova.
      </p>

      <div className="space-y-6">
        <EmailTemplatesSection templates={templatesRes.data ?? []} />
        <AttachmentTemplatesSection attachments={attachmentsRes.data ?? []} />
        <CcBccSection options={ccRes.data ?? []} />
        <FollowUpSettingsSection settings={followUpSettings} />
      </div>
    </div>
  );
}
