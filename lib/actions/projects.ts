"use server";

import { checkRole } from "@/lib/dal";
import {
  getAllProjects,
  getProjects,
  PROJECT_COOKIE,
  PROJECT_COOKIE_MAX_AGE,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

// Prebacivanje projekta menja sve što se vidi, pa se briše cela zaliha
// stranica u pretraživaču (next.config.ts drži dinamičke strane 30 sekundi)
function revalidateEverything() {
  revalidatePath("/", "layout");
}

// "GreenTour 2026" → "greentour-2026". Naša slova se prevode u latinicu bez
// kvačica, jer slug ide u kolačić i u proveru izbora projekta.
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Prvi slobodan oblik: "greentour", pa "greentour-2", "greentour-3"…
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// Svi koji uopšte imaju pristup smeju da biraju projekat na kom rade
export async function setActiveProject(slug: string): Promise<ActionResult> {
  const me = await checkRole("admin", "editor", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const projects = await getProjects();
  const project = projects.find((row) => row.slug === slug);
  if (!project) return { ok: false, error: "Nepoznat projekat." };

  const store = await cookies();
  store.set(PROJECT_COOKIE, project.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PROJECT_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  revalidateEverything();
  return { ok: true, message: `Projekat: ${project.name}.` };
}

export async function createProject(rawName: string): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const name = cleanText(rawName, 100);
  if (!name) return { ok: false, error: "Naziv projekta je obavezan." };

  const existing = await getAllProjects();
  if (
    existing.some(
      (project) => project.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Projekat sa ovim nazivom već postoji." };
  }

  const base = toSlug(name);
  if (!base) {
    return {
      ok: false,
      error: "Naziv mora da sadrži bar jedno slovo ili cifru.",
    };
  }

  const slug = uniqueSlug(
    base,
    new Set(existing.map((project) => project.slug)),
  );

  const supabase = createClient();
  const { error } = await supabase.from("projects").insert({ slug, name });

  if (error) return { ok: false, error: "Greška pri dodavanju projekta." };

  revalidateEverything();
  return { ok: true, message: `Projekat ${name} je dodat.` };
}

export async function renameProject(
  projectId: number,
  rawName: string,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(projectId)) return { ok: false, error: "Nepoznat projekat." };

  const name = cleanText(rawName, 100);
  if (!name) return { ok: false, error: "Naziv projekta je obavezan." };

  const existing = await getAllProjects();
  if (
    existing.some(
      (project) =>
        project.id !== projectId &&
        project.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Projekat sa ovim nazivom već postoji." };
  }

  // Slug ostaje kakav jeste: po njemu se pamti izbor u kolačiću, pa bi
  // promena izbacila ceo tim na podrazumevani projekat
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId);

  if (error) return { ok: false, error: "Greška pri izmeni projekta." };

  revalidateEverything();
  return { ok: true, message: "Naziv projekta je izmenjen." };
}

// Arhiviranje ne dira istoriju — projekat se samo više ne nudi u biraču
export async function setProjectArchived(
  projectId: number,
  archived: boolean,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(projectId)) return { ok: false, error: "Nepoznat projekat." };

  const projects = await getAllProjects();
  const project = projects.find((row) => row.id === projectId);
  if (!project) return { ok: false, error: "Projekat ne postoji." };

  const active = projects.filter((row) => !row.archived);
  if (archived && active.length <= 1) {
    return {
      ok: false,
      error: "Bar jedan projekat mora da ostane aktivan.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived })
    .eq("id", projectId);

  if (error) return { ok: false, error: "Greška pri izmeni projekta." };

  revalidateEverything();
  return {
    ok: true,
    message: archived
      ? `Projekat ${project.name} je arhiviran.`
      : `Projekat ${project.name} je vraćen u rad.`,
  };
}

// Tabele koje bi brisanjem projekta izgubile istoriju ili podešavanja.
// Baza ovo brani stranim ključem (db/projects.sql); ovde se proverava unapred,
// da bi poruka bila razumljiva.
const PROJECT_TABLES = [
  "assignments",
  "interactions",
  "contact_status",
  "emails",
  "email_templates",
  "attachment_templates",
] as const;

export async function deleteProject(projectId: number): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(projectId)) return { ok: false, error: "Nepoznat projekat." };

  const projects = await getAllProjects();
  const project = projects.find((row) => row.id === projectId);
  if (!project) return { ok: false, error: "Projekat ne postoji." };
  if (projects.length <= 1) {
    return { ok: false, error: "Poslednji projekat se ne može obrisati." };
  }

  const supabase = createClient();

  const counts = await Promise.all(
    PROJECT_TABLES.map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
    ),
  );

  if (counts.some((res) => (res.count ?? 0) > 0)) {
    return {
      ok: false,
      error:
        "Projekat ima upisane podatke, pa se ne može obrisati — arhiviraj ga umesto toga.",
    };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) return { ok: false, error: "Greška pri brisanju projekta." };

  revalidateEverything();
  return { ok: true, message: `Projekat ${project.name} je obrisan.` };
}
