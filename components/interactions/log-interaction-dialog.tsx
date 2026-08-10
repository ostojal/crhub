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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logInteractions } from "@/lib/actions/interactions";
import {
  COMMUNICATION_STATUSES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  INTEREST_TAGS,
  NOTE_TYPE,
} from "@/lib/constants";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const NO_CHANGE = "none";

export type LogContact = { id: number; name: string };

// Renderuje se uslovno (kad je otvoren) da stanje uvek krene sveže;
// radi i za jedan i za više kontakata odjednom
export function LogInteractionDialog({
  contacts,
  defaultType,
  onClose,
}: {
  contacts: LogContact[];
  // Podsetnik za poziv otvara dijalog sa već izabranim tipom
  defaultType?: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<string>(defaultType ?? INTERACTION_TYPES[0]);
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [tag, setTag] = useState<string>(NO_CHANGE);
  const [isPending, startTransition] = useTransition();

  const isBulk = contacts.length > 1;
  // Beleška nije kontaktiranje: ne menja status ni oznaku interesovanja, pa
  // se ta polja i ne prikazuju
  const isNote = type === NOTE_TYPE;

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await logInteractions(
        contacts.map((c) => c.id),
        {
          type,
          notes,
          newStatus: status ?? undefined,
          interestTag: tag === NO_CHANGE ? undefined : tag,
        },
      );

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
            {isNote
              ? isBulk
                ? `Dodaj belešku (${contacts.length})`
                : "Dodaj belešku"
              : isBulk
                ? `Evidentiraj kontaktiranje (${contacts.length})`
                : "Evidentiraj kontaktiranje"}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <>Kontakti: {contacts.map((c) => c.name).join(", ")}</>
            ) : (
              <>
                Kontakt:{" "}
                <span className="font-medium">{contacts[0]?.name}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interaction-type">Tip</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="interaction-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INTERACTION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isNote ? (
            <p className="text-sm text-muted-foreground">
              Beleška se upisuje u istoriju kontakta, ali se ne broji kao
              kontaktiranje i ne menja status.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Novi status kontakta
              </legend>
              {COMMUNICATION_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="interaction-status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="accent-primary"
                  />
                  {s}
                </label>
              ))}
            </fieldset>
          )}

          <div className="space-y-2">
            <Label htmlFor="interaction-notes">
              {isNote ? "Beleška" : "Beleške"}
            </Label>
            <Textarea
              id="interaction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Šta je dogovoreno, utisci..."
              rows={3}
            />
          </div>

          {!isNote && (
            <div className="space-y-2">
              <Label htmlFor="interaction-tag">Oznaka interesovanja</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger id="interaction-tag" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE}>{""}</SelectItem>
                  {INTEREST_TAGS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Otkaži
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (isNote && notes.trim() === "")}
          >
            {isPending ? "Čuvanje..." : "Sačuvaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
