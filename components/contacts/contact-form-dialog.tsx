"use client";

import { Button } from "@/components/ui/button";
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
  type ContactInput,
  createContact,
  updateContact,
} from "@/lib/actions/contacts";
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
  NO_CATEGORY_LABEL,
} from "@/lib/constants";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export type ContactEditable = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  category: string | null;
  notes: string | null;
};

const NO_CATEGORY = "none";

const FIELDS: {
  name: keyof ContactInput;
  label: string;
  required?: boolean;
  type?: string;
}[] = [
  { name: "first_name", label: "Ime", required: true },
  { name: "last_name", label: "Prezime", required: true },
  { name: "company", label: "Kompanija" },
  { name: "job_title", label: "Pozicija" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Telefon" },
  { name: "mobile_phone", label: "Mobilni telefon" },
  { name: "city", label: "Grad" },
];

// Renderuje se uslovno (kad je otvoren); contact=null znači novi kontakt
export function ContactFormDialog({
  contact,
  onClose,
}: {
  contact: ContactEditable | null;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(contact?.category || NO_CATEGORY);
  const [isPending, startTransition] = useTransition();
  const isEdit = contact !== null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const input = Object.fromEntries(
      FIELDS.map((field) => [
        field.name,
        String(formData.get(field.name) ?? ""),
      ]),
    ) as unknown as ContactInput;
    input.notes = String(formData.get("notes") ?? "");
    input.category = category === NO_CATEGORY ? "" : category;

    startTransition(async () => {
      const result = isEdit
        ? await updateContact(contact.id, input)
        : await createContact(input);

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
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Izmeni kontakt" : "Novi kontakt"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Izmene su odmah vidljive svima koji imaju pristup kontaktu."
              : "Popuni podatke o novom kontaktu."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`contact-${field.name}`}>
                  {field.label}
                  {field.required && " *"}
                </Label>
                <Input
                  id={`contact-${field.name}`}
                  name={field.name}
                  type={field.type ?? "text"}
                  required={field.required}
                  defaultValue={contact?.[field.name] ?? ""}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-category">Kategorija partnera</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="contact-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>{NO_CATEGORY_LABEL}</SelectItem>
                {CONTACT_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CONTACT_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-notes">Beleške</Label>
            <Textarea
              id="contact-notes"
              name="notes"
              rows={3}
              defaultValue={contact?.notes ?? ""}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Otkaži
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Čuvanje..."
                : isEdit
                  ? "Sačuvaj izmene"
                  : "Dodaj kontakt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
