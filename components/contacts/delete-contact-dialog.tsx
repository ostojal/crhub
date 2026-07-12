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
import {
  deleteContact,
  getContactDeleteImpact,
} from "@/lib/actions/contacts";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Impact = { interactions: number; assigned: boolean };

export function DeleteContactDialog({
  contactId,
  contactName,
  onClose,
}: {
  contactId: number;
  contactName: string;
  onClose: () => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getContactDeleteImpact(contactId).then((result) => {
      if (!cancelled && result.ok) {
        setImpact({
          interactions: result.interactions,
          assigned: result.assigned,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContact(contactId);

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
          <DialogTitle>Obriši kontakt</DialogTitle>
          <DialogDescription>
            Da li sigurno želiš da obrišeš kontakt{" "}
            <span className="font-medium">{contactName}</span>? Ovo se ne može
            opozvati.
          </DialogDescription>
        </DialogHeader>

        {impact && (impact.interactions > 0 || impact.assigned) && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Zajedno sa kontaktom
            {impact.interactions > 0 &&
              ` se briše i istorija kontaktiranja (${impact.interactions})`}
            {impact.interactions > 0 && impact.assigned && ", a"}
            {impact.assigned && " kontakt nestaje iz radnog prostora korisnika"}
            .
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Otkaži
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Brisanje..." : "Obriši"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
