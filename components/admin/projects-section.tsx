"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createProject,
  deleteProject,
  renameProject,
  setActiveProject,
  setProjectArchived,
} from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/types";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

export type AdminProject = {
  id: number;
  slug: string;
  name: string;
  archived: boolean;
  // Zbirno stanje po projektu — pokazuje šta bi brisanje odnelo
  assignments: number;
  interactions: number;
  emails: number;
};

export function ProjectsSection({
  projects,
  activeSlug,
}: {
  projects: AdminProject[];
  activeSlug: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [renaming, setRenaming] = useState<AdminProject | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) toast.success(result.message ?? "Sačuvano.");
      else toast.error(result.error);
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");

    startTransition(async () => {
      const result = await createProject(name);

      if (result.ok) {
        toast.success(result.message);
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renaming) return;

    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    const target = renaming;

    startTransition(async () => {
      const result = await renameProject(target.id, name);

      if (result.ok) {
        toast.success(result.message);
        setRenaming(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Projekti</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kontakti su zajednički za sve projekte, a dodele, statusi, istorija
            kontaktiranja, mejlovi i mejl šabloni pripadaju po jednom projektu.
            Novi projekat kreće od nule.
          </p>

          <form
            ref={formRef}
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-48 flex-1 space-y-2">
              <Label htmlFor="new-project-name">Naziv novog projekta</Label>
              <Input
                id="new-project-name"
                name="name"
                required
                placeholder="npr. GreenTour"
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              <PlusIcon data-icon="inline-start" />
              Dodaj projekat
            </Button>
          </form>

          <ul className="divide-y rounded-md border">
            {projects.map((project) => {
              const isActive = project.slug === activeSlug;
              const isEmpty =
                project.assignments + project.interactions + project.emails ===
                0;

              return (
                <li key={project.id} className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{project.name}</span>
                    {isActive && <Badge>Aktivan</Badge>}
                    {project.archived && (
                      <Badge variant="outline">Arhiviran</Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Dodela: {project.assignments} · Kontaktiranja:{" "}
                    {project.interactions} · Mejlova: {project.emails}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {!isActive && !project.archived && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          run(() => setActiveProject(project.slug))
                        }
                      >
                        Pređi na projekat
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setRenaming(project)}
                    >
                      <PencilIcon data-icon="inline-start" />
                      Preimenuj
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          setProjectArchived(project.id, !project.archived),
                        )
                      }
                    >
                      {project.archived ? (
                        <>
                          <ArchiveRestoreIcon data-icon="inline-start" />
                          Vrati u rad
                        </>
                      ) : (
                        <>
                          <ArchiveIcon data-icon="inline-start" />
                          Arhiviraj
                        </>
                      )}
                    </Button>

                    {/* Projekat sa upisanim radom se ne briše — arhivira se */}
                    {isEmpty && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => run(() => deleteProject(project.id))}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Obriši
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preimenuj projekat</DialogTitle>
            <DialogDescription>
              Menja se samo naziv koji se vidi u aplikaciji; svi upisani podaci
              ostaju na projektu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-project">Naziv</Label>
              <Input
                id="rename-project"
                name="name"
                required
                defaultValue={renaming?.name ?? ""}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Otkaži
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Čuvanje..." : "Sačuvaj"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
