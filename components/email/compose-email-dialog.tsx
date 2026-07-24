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
import { Textarea } from "@/components/ui/textarea";
import {
  composeEmail,
  getComposeContext,
  type ComposeContext,
} from "@/lib/actions/emails";
import { MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/constants";
import { applyPlaceholders } from "@/lib/email/placeholders";
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

// Renderuje se uslovno (kad je otvoren) da stanje uvek krene sveže
export function ComposeEmailDialog({
  contactId,
  contactName,
  onClose,
}: {
  contactId: number;
  contactName: string;
  onClose: () => void;
}) {
  const [context, setContext] = useState<ComposeContext | null>(null);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState<number[]>([]);
  const [bcc, setBcc] = useState<number[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPending, startTransition] = useTransition();

  // Šabloni, CC/BCC liste i stanje Gmail veze stižu jednim pozivom kad se
  // dijalog otvori
  useEffect(() => {
    let cancelled = false;

    getComposeContext(contactId).then((result) => {
      if (!cancelled) setContext(result);
    });

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const handleTemplate = (value: string) => {
    setTemplateId(value);
    if (value === NO_TEMPLATE || !context?.ok) return;

    const template = context.templates.find((t) => String(t.id) === value);
    if (!template) return;

    // Placeholderi se zamenjuju odmah, a polja ostaju izmenjiva
    setSubject(applyPlaceholders(template.subject, context.contact));
    setBody(applyPlaceholders(template.body, context.contact));
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

    startTransition(async () => {
      const result = await composeEmail({
        contactId,
        cc,
        bcc,
        subject,
        body,
        attachmentIds,
        scheduledAt:
          mode === "later" ? new Date(scheduledAt).toISOString() : undefined,
      });

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
          <DialogTitle>Kontaktiraj</DialogTitle>
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
                  <Label htmlFor="email-body">Poruka</Label>
                  <Textarea
                    id="email-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Tekst mejla…"
                    rows={10}
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
                    Pošalji odmah
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="email-mode"
                      checked={mode === "later"}
                      onChange={() => setMode("later")}
                      className="accent-primary"
                    />
                    Zakaži za kasnije
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
                  Mejl se šalje sa adrese {context.gmailEmail} i automatski se
                  evidentira kao kontaktiranje.
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
                  !body.trim()
                }
              >
                {isPending
                  ? "Slanje…"
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
