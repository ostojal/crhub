"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAttachmentUpload,
  deleteAttachmentTemplate,
  saveAttachmentTemplate,
} from "@/lib/actions/email-admin";
import { MAX_ATTACHMENT_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export type AttachmentTemplate = {
  id: number;
  name: string;
  size_bytes: number;
  mime_type: string;
};

// Fajl ide pravo u Supabase Storage preko potpisanog URL-a, mimo servera —
// Vercel bi odbio request veći od 4.5MB
async function uploadToSignedUrl(uploadUrl: string, file: File) {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: { "x-upsert": "false" },
  });

  if (!response.ok) {
    throw new Error(`Otpremanje nije uspelo (HTTP ${response.status}).`);
  }
}

export function AttachmentTemplatesSection({
  attachments,
}: {
  attachments: AttachmentTemplate[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");

    if (!(file instanceof File) || file.size === 0) {
      toast.error("Izaberi fajl.");
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(
        `Fajl je prevelik (najviše ${formatBytes(MAX_ATTACHMENT_BYTES)}).`,
      );
      return;
    }

    setIsUploading(true);
    try {
      const upload = await createAttachmentUpload(file.name, file.size);
      if (!upload.ok) {
        toast.error(upload.error);
        return;
      }

      await uploadToSignedUrl(upload.uploadUrl, file);

      const result = await saveAttachmentTemplate({
        name: String(data.get("name") ?? "") || file.name,
        storagePath: upload.storagePath,
        mimeType: file.type,
      });

      if (result.ok) {
        toast.success(result.message);
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Otpremanje nije uspelo.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await deleteAttachmentTemplate(id);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prilozi</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attachment-file">Fajl</Label>
              <Input id="attachment-file" name="file" type="file" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment-name">Naziv (opciono)</Label>
              <Input
                id="attachment-name"
                name="name"
                placeholder="Ime fajla u mejlu"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isUploading || isPending}>
              <UploadIcon data-icon="inline-start" />
              {isUploading ? "Otpremanje…" : "Dodaj prilog"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Najviše {formatBytes(MAX_ATTACHMENT_BYTES)} po fajlu.
            </span>
          </div>
        </form>

        {attachments.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Još nema priloga.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(attachment.size_bytes)} ·{" "}
                    {attachment.mime_type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Obriši prilog ${attachment.name}`}
                  disabled={isPending}
                  onClick={() => handleDelete(attachment.id)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
