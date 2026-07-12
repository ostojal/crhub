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
import { logInteraction } from "@/lib/actions/interactions";
import {
  COMMUNICATION_STATUSES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  INTEREST_TAGS,
} from "@/lib/constants";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const NO_CHANGE = "none";

// Renderuje se uslovno (kad je otvoren) da stanje uvek krene sveže
export function LogInteractionDialog({
  contactId,
  contactName,
  onClose,
}: {
  contactId: number;
  contactName: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<string>(INTERACTION_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>(NO_CHANGE);
  const [tag, setTag] = useState<string>(NO_CHANGE);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await logInteraction({
        contactId,
        type,
        notes,
        newStatus: status === NO_CHANGE ? undefined : status,
        interestTag: tag === NO_CHANGE ? undefined : tag,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evidentiraj kontaktiranje</DialogTitle>
          <DialogDescription>
            Kontakt: <span className="font-medium">{contactName}</span>
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

          <div className="space-y-2">
            <Label htmlFor="interaction-notes">Beleške</Label>
            <Textarea
              id="interaction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Šta je dogovoreno, utisci..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interaction-status">Novi status kontakta</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="interaction-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Bez promene</SelectItem>
                {COMMUNICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interaction-tag">Oznaka interesovanja</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger id="interaction-tag" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Bez promene</SelectItem>
                {INTEREST_TAGS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Otkaži
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Čuvanje..." : "Sačuvaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
