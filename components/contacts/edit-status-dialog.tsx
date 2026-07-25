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
import { updateContactsStatus } from "@/lib/actions/contacts";
import { COMMUNICATION_STATUSES, INTEREST_TAGS } from "@/lib/constants";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const NO_TAG = "none";
const KEEP_TAG = "keep";

export type StatusContact = { id: number; name: string };

// Radi i za jedan i za više kontakata odjednom. Pri masovnoj izmeni oznaka
// podrazumevano ostaje netaknuta jer izabrani kontakti imaju različite.
export function EditStatusDialog({
  contacts,
  currentStatus,
  currentTag,
  onClose,
}: {
  contacts: StatusContact[];
  currentStatus?: string | null;
  currentTag?: string | null;
  onClose: () => void;
}) {
  const isBulk = contacts.length > 1;

  const [status, setStatus] = useState<string>(
    currentStatus ?? COMMUNICATION_STATUSES[0],
  );
  const [tag, setTag] = useState<string>(
    isBulk ? KEEP_TAG : (currentTag ?? NO_TAG),
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateContactsStatus(
        contacts.map((c) => c.id),
        status,
        tag === KEEP_TAG ? undefined : tag === NO_TAG ? null : tag,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Izmeni status (${contacts.length})` : "Izmeni status"}
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
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tag">Oznaka interesovanja</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger id="edit-tag" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isBulk && <SelectItem value={KEEP_TAG}>Ne menjaj</SelectItem>}
                <SelectItem value={NO_TAG}>Bez oznake</SelectItem>
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
