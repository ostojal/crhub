"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  composeEmail,
  getComposeContext,
  updateScheduledEmail,
  type ComposeContext,
} from "@/lib/actions/emails";
import { MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/constants";
import { isEmptyHtml, looksLikeHtml, textToHtml } from "@/lib/email/html";
import {
  applyPlaceholders,
  type PlaceholderContact,
  type PlaceholderSender,
} from "@/lib/email/placeholders";
import { formatBytes } from "@/lib/format";
import { MailIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

const NO_TEMPLATE = "none";

// datetime-local radi sa lokalnim vremenom bez zone; pretvaramo ga u ISO tek
// pri slanju, pa server uvek dobija UTC
function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Potpis ide na dno poruke, odvojen praznim redom (kao u Gmailu)
function signatureBlock(
  signature: string | null,
  contact: PlaceholderContact,
  sender: PlaceholderSender,
): string {
  if (!signature) return "";

  const filled = applyPlaceholders(signature, contact, sender);
  return `<br><br>${looksLikeHtml(filled) ? filled : textToHtml(filled)}`;
}

// Zakazani mejl koji se menja umesto da se pravi novi
export type EmailDraft = {
  id: number;
  subject: string;
  body: string;
  ccIds: number[];
  bccIds: number[];
  attachmentIds: number[];
  scheduledAt: string;
};

// Renderuje se uslovno (kad je otvoren) da stanje uvek krene sveže
export function ComposeEmailDialog({
  contactId,
  contactName,
  draft,
  onClose,
}: {
  contactId: number;
  contactName: string;
  draft?: EmailDraft | null;
  onClose: () => void;
}) {
  const isEdit = !!draft;

  const [context, setContext] = useState<ComposeContext | null>(null);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  // Menja se kad potpis stigne sa servera, da se editor remountuje sa njim
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  const [cc, setCc] = useState<number[]>(draft?.ccIds ?? []);
  const [bcc, setBcc] = useState<number[]>(draft?.bccIds ?? []);
  const [attachmentIds, setAttachmentIds] = useState<number[]>(
    draft?.attachmentIds ?? [],
  );
  const [mode, setMode] = useState<"now" | "later">(isEdit ? "later" : "now");
  const [scheduledAt, setScheduledAt] = useState(
    draft ? toLocalInputValue(new Date(draft.scheduledAt)) : "",
  );
  const [isPending, startTransition] = useTransition();

  // Šabloni, CC/BCC liste, potpis i stanje Gmail veze stižu jednim pozivom
  // kad se dijalog otvori
  useEffect(() => {
    let cancelled = false;

    getComposeContext(contactId).then((result) => {
      if (cancelled) return;

      setContext(result);

      // Potpis se odmah upisuje u telo (kao u Gmailu) da korisnik vidi i
      // može da ga izmeni pre slanja. Pri izmeni je već u tekstu.
      if (!isEdit && result.ok && result.signature) {
        setBody(
          signatureBlock(result.signature, result.contact, result.sender),
        );
        setSignatureLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contactId, isEdit]);

  const handleTemplate = (value: string) => {
    setTemplateId(value);
    if (value === NO_TEMPLATE || !context?.ok) return;

    const template = context.templates.find((t) => String(t.id) === value);
    if (!template) return;

    const { contact, sender, signature } = context;

    // Placeholderi se zamenjuju odmah, a polja ostaju izmenjiva
    setSubject(applyPlaceholders(template.subject, contact, sender));

    const templateBody = applyPlaceholders(template.body, contact, sender);
    setBody(
      `${looksLikeHtml(templateBody) ? templateBody : textToHtml(templateBody)}${signatureBlock(signature, contact, sender)}`,
    );
  };

  const selectedBytes = context?.ok
    ? context.attachments
        .filter((a) => attachmentIds.includes(a.id))
        .reduce((sum, a) => sum + a.size_bytes, 0)
    : 0;

  const tooBig = selectedBytes > MAX_TOTAL_ATTACHMENT_BYTES;

  const handleSubmit = () => {
    if (mode === "later" && !scheduledAt) {
      toast.error("Izaberi vreme slanja.");
      return;
    }

    const payload = {
      cc,
      bcc,
      subject,
      body,
      attachmentIds,
      // Pri izmeni „odmah" znači: pomeri termin na sad, pa ga cron pošalje u
      // sledećem prolazu (mejl ostaje u redu, ne šalje se iz ove akcije)
      scheduledAt:
        mode === "later"
          ? new Date(scheduledAt).toISOString()
          : isEdit
            ? new Date().toISOString()
            : undefined,
    };

    startTransition(async () => {
      const result = draft
        ? await updateScheduledEmail(draft.id, payload)
        : await composeEmail({ contactId, ...payload });

      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Izmeni zakazani mejl" : "Kontaktiraj"}
          </DialogTitle>
          <DialogDescription>
            Kontakt: <span className="font-medium">{contactName}</span>
          </DialogDescription>
        </DialogHeader>

        {!context && (
          <p className="py-6 text-sm text-muted-foreground">Učitavanje…</p>
        )}

        {context && !context.ok && (
          <p className="py-6 text-sm text-destructive">{context.error}</p>
        )}

        {context?.ok && context.gmail !== "connected" && (
          <div className="space-y-3 py-4">
            <p className="text-sm">
              {context.gmail === "broken"
                ? "Veza sa Gmail nalogom je istekla ili je opozvana. Poveži nalog ponovo da bi mogao da šalješ mejlove."
                : "Da bi slao mejlove iz aplikacije, prvo poveži svoj Gmail nalog. Mejlovi se šalju sa tvoje adrese, a odgovori stižu u tvoje sanduče."}
            </p>
            <Button asChild>
              <Link href="/api/google/connect" prefetch={false}>
                <MailIcon data-icon="inline-start" />
                Poveži Gmail
              </Link>
            </Button>
          </div>
        )}

        {context?.ok && context.gmail === "connected" && (
          <>
            {!context.contact.email ? (
              <p className="py-6 text-sm text-muted-foreground">
                Ovaj kontakt nema email adresu, pa mu se ne može poslati mejl.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-to">Prima</Label>
                  <Input
                    id="email-to"
                    value={context.contact.email}
                    readOnly
                    className="text-muted-foreground"
                  />
                </div>

                {context.templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="email-template">Šablon</Label>
                    <Select value={templateId} onValueChange={handleTemplate}>
                      <SelectTrigger id="email-template" className="w-full">
                        <SelectValue placeholder="Bez šablona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEMPLATE}>Bez šablona</SelectItem>
                        {context.templates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {context.ccOptions.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RecipientPicker
                      title="CC"
                      options={context.ccOptions}
                      selected={cc}
                      onToggle={(id) => setCc((prev) => toggle(prev, id))}
                    />
                    <RecipientPicker
                      title="BCC"
                      options={context.ccOptions}
                      selected={bcc}
                      onToggle={(id) => setBcc((prev) => toggle(prev, id))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email-subject">Naslov</Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Naslov mejla"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Poruka</Label>
                  {/* key remountuje editor kad šablon zameni sadržaj */}
                  <RichTextEditor
                    key={`${templateId}-${signatureLoaded}`}
                    defaultValue={body}
                    onChange={setBody}
                    ariaLabel="Tekst mejla"
                    placeholder="Tekst mejla…"
                  />
                </div>

                {context.attachments.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Prilozi</legend>
                    {context.attachments.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={attachmentIds.includes(a.id)}
                          onCheckedChange={() =>
                            setAttachmentIds((prev) => toggle(prev, a.id))
                          }
                        />
                        <span>{a.name}</span>
                        <span className="text-muted-foreground">
                          ({formatBytes(a.size_bytes)})
                        </span>
                      </label>
                    ))}
                    {tooBig && (
                      <p className="text-sm text-destructive">
                        Prilozi su preveliki ({formatBytes(selectedBytes)}, a
                        najviše je {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}).
                      </p>
                    )}
                  </fieldset>
                )}

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Slanje</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="email-mode"
                      checked={mode === "now"}
                      onChange={() => setMode("now")}
                      className="accent-primary"
                    />
                    {isEdit ? "Pošalji što pre" : "Pošalji odmah"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="email-mode"
                      checked={mode === "later"}
                      onChange={() => setMode("later")}
                      className="accent-primary"
                    />
                    {isEdit ? "Zakaži za drugo vreme" : "Zakaži za kasnije"}
                  </label>

                  {mode === "later" && (
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      min={toLocalInputValue(new Date())}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1"
                    />
                  )}
                </fieldset>

                <p className="text-xs text-muted-foreground">
                  Mejl se šalje kao{" "}
                  {context.sender.full_name
                    ? `${context.sender.full_name} <${context.gmailEmail}>`
                    : context.gmailEmail}{" "}
                  i automatski se evidentira kao kontaktiranje.
                </p>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Otkaži
                </Button>
              </DialogClose>
              <Button
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  tooBig ||
                  !context.contact.email ||
                  !subject.trim() ||
                  isEmptyHtml(body)
                }
              >
                {isPending
                  ? isEdit
                    ? "Čuvanje…"
                    : "Slanje…"
                  : isEdit
                    ? "Sačuvaj izmene"
                    : mode === "later"
                      ? "Zakaži"
                      : "Pošalji"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecipientPicker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: number; email: string; label: string | null }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(option.id)}
            onCheckedChange={() => onToggle(option.id)}
          />
          <span className="min-w-0 truncate">
            {option.label ? `${option.label} — ` : ""}
            {option.email}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
