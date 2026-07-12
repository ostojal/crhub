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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteUser, updateUserRole } from "@/lib/actions/users";
import {
  PENDING_ROLE_LABEL,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/lib/constants";
import { isOneOf } from "@/lib/validate";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export type AdminUser = {
  id: number;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
};

const PENDING_VALUE = "pending";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: number;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: number, value: string) => {
    startTransition(async () => {
      const result = await updateUserRole(
        userId,
        value === PENDING_VALUE ? null : (value as Role),
      );

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Korisnik</TableHead>
            <TableHead className="px-4">Uloga</TableHead>
            <TableHead className="px-4">Dodat</TableHead>
            <TableHead className="px-4 text-right">Akcije</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length ? (
            users.map((user) => {
              const isSelf = user.id === currentUserId;

              return (
                <TableRow key={user.id}>
                  <TableCell className="px-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.full_name || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Select
                      value={
                        user.role && isOneOf(user.role, ROLES)
                          ? user.role
                          : PENDING_VALUE
                      }
                      onValueChange={(value) =>
                        handleRoleChange(user.id, value)
                      }
                      disabled={isSelf || isPending}
                    >
                      <SelectTrigger
                        className="w-40"
                        title={
                          isSelf
                            ? "Ne možeš menjati sopstvenu ulogu"
                            : undefined
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PENDING_VALUE}>
                          {PENDING_ROLE_LABEL}
                        </SelectItem>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4">
                    {format(user.created_at, "dd.MM.yyyy.")}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    {!isSelf && (
                      <DeleteUserButton
                        userId={user.id}
                        email={user.email || "—"}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Nema korisnika.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function DeleteUserButton({
  userId,
  email,
}: {
  userId: number;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUser(userId);

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Obriši korisnika ${email}`}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Obriši korisnika</DialogTitle>
          <DialogDescription>
            Da li sigurno želiš da obrišeš korisnika{" "}
            <span className="font-medium">{email}</span>? Njegove dodele će biti
            uklonjene.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Otkaži</Button>
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
