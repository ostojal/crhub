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
import {
  assignCompany,
  assignContact,
  assignContacts,
  getCompanyAssignmentInfo,
} from "@/lib/actions/assignments";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type AssigneeOption,
  type ContactRow,
  getAssigneeName,
  isAssigned,
} from "./columns";

export type AssignTarget =
  | { kind: "single"; contact: ContactRow }
  | { kind: "bulk"; contacts: ContactRow[] };

type CompanyInfo = { total: number; assigned: number };

export function assigneeLabel(assignee: AssigneeOption): string {
  return assignee.full_name || assignee.email || `Korisnik #${assignee.id}`;
}

export function AssignDialog({
  target,
  assignees,
  onClose,
  onSuccess,
}: {
  target: AssignTarget | null;
  assignees: AssigneeOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (!target) return null;

  // key remountuje sadržaj za svaki novi target, pa unutrašnje stanje
  // (izabrani korisnik, opseg) uvek kreće sveže
  const key =
    target.kind === "single"
      ? `single-${target.contact.id}`
      : `bulk-${target.contacts.map((c) => c.id).join(",")}`;

  return (
    <AssignDialogInner
      key={key}
      target={target}
      assignees={assignees}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function AssignDialogInner({
  target,
  assignees,
  onClose,
  onSuccess,
}: {
  target: AssignTarget;
  assignees: AssigneeOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState<string>("");
  const [scope, setScope] = useState<"contact" | "company">("contact");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isPending, startTransition] = useTransition();

  const singleContact = target.kind === "single" ? target.contact : null;
  const company = singleContact?.company || null;

  useEffect(() => {
    if (!company) return;

    let cancelled = false;
    getCompanyAssignmentInfo(company).then((info) => {
      if (!cancelled && info.ok) {
        setCompanyInfo({ total: info.total, assigned: info.assigned });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [company]);

  const bulkContacts = target.kind === "bulk" ? target.contacts : [];
  const bulkAlreadyAssigned = bulkContacts.filter(isAssigned).length;
  const currentAssignee = singleContact ? getAssigneeName(singleContact) : null;

  const handleSubmit = () => {
    const id = Number(userId);
    if (!id) {
      toast.error("Izaberi korisnika.");
      return;
    }

    startTransition(async () => {
      const result =
        target.kind === "bulk"
          ? await assignContacts(
              bulkContacts.map((c) => c.id),
              id,
            )
          : scope === "company" && company
            ? await assignCompany(company, id)
            : await assignContact(singleContact!.id, id, true);

      if (result.ok) {
        toast.success(result.message);
        onSuccess();
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
            {target.kind === "bulk"
              ? `Dodeli izabrane kontakte (${bulkContacts.length})`
              : "Dodeli kontakt"}
          </DialogTitle>
          <DialogDescription>
            Izabrani korisnik će videti kontakte u svom radnom prostoru i moći
            da evidentira kontaktiranja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-user">Korisnik</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="assign-user" className="w-full">
                <SelectValue placeholder="Izaberi korisnika" />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={String(assignee.id)}>
                    {assigneeLabel(assignee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignees.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nijedan nalog nema ulogu Korisnik — dodaj je u panelu
                Korisnici.
              </p>
            )}
          </div>

          {singleContact && company && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Opseg dodele</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assign-scope"
                  value="contact"
                  checked={scope === "contact"}
                  onChange={() => setScope("contact")}
                  className="accent-primary"
                />
                Samo ovaj kontakt
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assign-scope"
                  value="company"
                  checked={scope === "company"}
                  onChange={() => setScope("company")}
                  className="accent-primary"
                />
                <span>
                  Svi kontakti firme {company}
                  {companyInfo &&
                    ` (${companyInfo.total}, dodeljeno ${companyInfo.assigned})`}
                </span>
              </label>
            </fieldset>
          )}

          {singleContact && scope === "contact" && currentAssignee && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Kontakt je već dodeljen: {currentAssignee}. Dodela će ga
              prebaciti na izabranog korisnika.
            </p>
          )}
          {singleContact &&
            scope === "company" &&
            (companyInfo?.assigned ?? 0) > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Već dodeljeni kontakti firme biće prebačeni na izabranog
                korisnika.
              </p>
            )}
          {target.kind === "bulk" && bulkAlreadyAssigned > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Već dodeljenih u izboru: {bulkAlreadyAssigned}. Biće prebačeni
              na izabranog korisnika.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Otkaži
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending || !userId}>
            {isPending ? "Dodeljivanje..." : "Dodeli"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
