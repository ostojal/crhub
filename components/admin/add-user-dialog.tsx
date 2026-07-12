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
  DialogTrigger,
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
import { addUser } from "@/lib/actions/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/constants";
import { PlusIcon } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");

    startTransition(async () => {
      const result = await addUser(String(email ?? ""), role);

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setRole("user");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Dodaj korisnika
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj korisnika</DialogTitle>
          <DialogDescription>
            Kada se osoba prvi put prijavi Google nalogom sa ovim emailom, odmah
            dobija izabranu ulogu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-user-email">Email</Label>
            <Input
              id="add-user-email"
              name="email"
              type="email"
              required
              placeholder="ime@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-user-role">Uloga</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="add-user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Otkaži
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Dodavanje..." : "Dodaj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
