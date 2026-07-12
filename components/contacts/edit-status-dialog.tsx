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
import { updateContactStatus } from "@/lib/actions/contacts";
import { COMMUNICATION_STATUSES, INTEREST_TAGS } from "@/lib/constants";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const NO_TAG = "none";

export function EditStatusDialog({
  contactId,
  contactName,
  currentStatus,
  currentTag,
  onClose,
}: {
  contactId: number;
  contactName: string;
  currentStatus: string | null;
  currentTag: string | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<string>(
    currentStatus ?? COMMUNICATION_STATUSES[0],
  );
  const [tag, setTag] = useState<string>(currentTag ?? NO_TAG);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateContactStatus(
        contactId,
        status,
        tag === NO_TAG ? null : tag,
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
          <DialogTitle>Izmeni status</DialogTitle>
          <DialogDescription>
            Kontakt: <span className="font-medium">{contactName}</span>
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
