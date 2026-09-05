"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveProject } from "@/lib/actions/projects";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export type ProjectOption = { slug: string; name: string };

// Birač projekta u navigaciji. Izbor se pamti u kolačiću, pa cela aplikacija
// (kontakti, dodele, statusi, mejlovi, analitika) odmah prikazuje taj projekat.
export function ProjectSwitcher({
  projects,
  activeSlug,
}: {
  projects: ProjectOption[];
  activeSlug: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  const active = projects.find((project) => project.slug === activeSlug);
  const label = active?.name ?? projects[0].name;

  const handleSelect = (slug: string) => {
    if (slug === activeSlug) return;

    startTransition(async () => {
      const result = await setActiveProject(slug);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          aria-label={`Projekat: ${label}`}
        >
          <span className="max-w-32 truncate">{label}</span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Projekat</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.slug}
            onSelect={() => handleSelect(project.slug)}
            className="justify-between gap-2"
          >
            <span className="truncate">{project.name}</span>
            {project.slug === activeSlug && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
