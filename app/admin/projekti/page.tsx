import {
  ProjectsSection,
  type AdminProject,
} from "@/components/admin/projects-section";
import { NOT_NOTE_FILTER } from "@/lib/constants";
import { requireRole } from "@/lib/dal";
import { getActiveProject, getAllProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProjectsPage() {
  await requireRole("admin");

  const [projects, active] = await Promise.all([
    getAllProjects(),
    getActiveProject(),
  ]);

  const supabase = createClient();

  // Koliko je na kom projektu upisano — po tome se vidi da li se projekat
  // uopšte može obrisati
  const rows: AdminProject[] = await Promise.all(
    projects.map(async (project) => {
      const [assignments, interactions, emails] = await Promise.all([
        supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id),
        // Beleške nisu kontaktiranje — isto pravilo kao svuda u analitici
        supabase
          .from("interactions")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id)
          .or(NOT_NOTE_FILTER),
        supabase
          .from("emails")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id),
      ]);

      return {
        ...project,
        assignments: assignments.count ?? 0,
        interactions: interactions.count ?? 0,
        emails: emails.count ?? 0,
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Projekti</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Svaki projekat ima svoje dodele, statuse, istoriju kontaktiranja i
        mejlove. Projekat na kom se radi bira se u zaglavlju.
      </p>

      {projects.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          Nema nijednog projekta — pokreni db/projects.sql u Supabase SQL
          editoru.
        </p>
      ) : (
        <ProjectsSection projects={rows} activeSlug={active?.slug ?? null} />
      )}
    </div>
  );
}
