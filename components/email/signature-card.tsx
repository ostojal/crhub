"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updateEmailSignature } from "@/lib/actions/emails";
import { SENDER_PLACEHOLDERS } from "@/lib/email/placeholders";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const PLACEHOLDER_HINT = SENDER_PLACEHOLDERS.map((t) => `{{${t}}}`).join(", ");

// Potpis se pri otvaranju kompozera upisuje na kraj poruke, isto kao potpis
// u Gmailu — vidi se pre slanja i može da se izmeni za pojedinačni mejl
export function SignatureCard({ signature }: { signature: string | null }) {
  const [value, setValue] = useState(signature ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateEmailSignature(value);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potpis</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Dodaje se na kraj svakog mejla koji sastaviš. Podržava formatiranje i
          slike (logo, baner) — nalepi ih pravo u polje. Možeš koristiti{" "}
          {PLACEHOLDER_HINT}.
        </p>

        <RichTextEditor
          defaultValue={signature ?? ""}
          onChange={setValue}
          ariaLabel="Potpis"
          placeholder="Srdačan pozdrav, {{moje_ime_i_prezime}}"
          minHeight="9rem"
        />

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Čuvanje…" : "Sačuvaj potpis"}
          </Button>
          {value !== (signature ?? "") && (
            <span className="text-xs text-muted-foreground">
              Ima nesačuvanih izmena.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
