"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  deleteEmailTemplate,
  saveEmailTemplate,
} from "@/lib/actions/email-admin";
import { isEmptyHtml } from "@/lib/email/html";
import { PLACEHOLDER_TOKENS } from "@/lib/email/placeholders";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  body: string;
};

const PLACEHOLDER_HINT = PLACEHOLDER_TOKENS.map((t) => `{{${t}}}`).join(", ");

export function EmailTemplatesSection({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  const [editing, setEditing] = useState<EmailTemplate | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await deleteEmailTemplate(id);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Šabloni mejlova</CardTitle>
        <Button size="sm" onClick={() => setEditing("new")}>
          <PlusIcon data-icon="inline-start" />
          Dodaj šablon
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          U naslovu i telu možeš koristiti: {PLACEHOLDER_HINT} — pri izboru
          šablona se zamenjuju podacima kontakta.
        </p>

        {templates.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Još nema šablona.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{template.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {template.subject}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Izmeni šablon ${template.name}`}
                    onClick={() => setEditing(template)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Obriši šablon ${template.name}`}
                    disabled={isPending}
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editing && (
        <TemplateDialog
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function TemplateDialog({
  template,
  onClose,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState(template?.body ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveEmailTemplate({
        ...(template && { id: template.id }),
        name: String(form.get("name") ?? ""),
        subject: String(form.get("subject") ?? ""),
        body,
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
          <DialogTitle>
            {template ? "Izmeni šablon" : "Novi šablon"}
          </DialogTitle>
          <DialogDescription>
            Dostupni placeholderi: {PLACEHOLDER_HINT}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Naziv šablona</Label>
            <Input
              id="template-name"
              name="name"
              required
              defaultValue={template?.name}
              placeholder="Prvi kontakt"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-subject">Naslov mejla</Label>
            <Input
              id="template-subject"
              name="subject"
              required
              defaultValue={template?.subject}
              placeholder="Saradnja sa {{firma}}"
            />
          </div>

          <div className="space-y-2">
            <Label>Telo mejla</Label>
            <RichTextEditor
              defaultValue={template?.body ?? ""}
              onChange={setBody}
              ariaLabel="Telo mejla"
              placeholder="Poštovani {{ime}}, …"
              minHeight="16rem"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Otkaži
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || isEmptyHtml(body)}>
              {isPending ? "Čuvanje…" : "Sačuvaj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
