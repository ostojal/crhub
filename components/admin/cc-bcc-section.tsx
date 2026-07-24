"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCcBccOption, deleteCcBccOption } from "@/lib/actions/email-admin";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRef, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export type CcBccOption = {
  id: number;
  email: string;
  label: string | null;
};

export function CcBccSection({ options }: { options: CcBccOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await addCcBccOption(
        String(data.get("email") ?? ""),
        String(data.get("label") ?? ""),
      );

      if (result.ok) {
        toast.success(result.message);
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await deleteCcBccOption(id);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CC / BCC adrese</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Korisnici u kompozeru mogu da izaberu CC i BCC samo sa ove liste.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cc-email">Email</Label>
              <Input
                id="cc-email"
                name="email"
                type="email"
                required
                placeholder="ime@firma.rs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-label">Naziv (opciono)</Label>
              <Input id="cc-label" name="label" placeholder="Direktor" />
            </div>
          </div>

          <Button type="submit" size="sm" disabled={isPending}>
            <PlusIcon data-icon="inline-start" />
            Dodaj adresu
          </Button>
        </form>

        {options.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Još nema adresa.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {options.map((option) => (
              <li
                key={option.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{option.email}</p>
                  {option.label && (
                    <p className="text-xs text-muted-foreground">
                      {option.label}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Obriši adresu ${option.email}`}
                  disabled={isPending}
                  onClick={() => handleDelete(option.id)}
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
