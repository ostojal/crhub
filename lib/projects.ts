import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

// Aktivan projekat se pamti u kolačiću, ne u URL-u: sve stranice ostaju na
// istim adresama, a prebacivanje projekta menja ceo prikaz odjednom.
export const PROJECT_COOKIE = "crhub_project";

// Godinu dana — izbor projekta je radna navika, ne kratkotrajno stanje
export const PROJECT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Project = {
  id: number;
  slug: string;
  name: string;
  archived: boolean;
};

const PROJECT_SELECT = "id, slug, name, archived";

// Svi projekti, uključujući arhivirane (za administraciju).
// cache() dedupira poziv unutar istog requesta.
export const getAllProjects = cache(async (): Promise<Project[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  return data ?? [];
});

// Projekti koji se nude u biraču. Arhiviran projekat zadržava svu istoriju,
// ali se u njemu više ne radi.
export async function getProjects(): Promise<Project[]> {
  return (await getAllProjects()).filter((project) => !project.archived);
}

// Projekat na kom se radi: izbor iz kolačića ako i dalje postoji, inače prvi
// napravljen (DigiHack). Null znači da tabela projekata još nije popunjena.
export const getActiveProject = cache(async (): Promise<Project | null> => {
  const projects = await getProjects();
  if (projects.length === 0) return null;

  const slug = (await cookies()).get(PROJECT_COOKIE)?.value;
  return projects.find((project) => project.slug === slug) ?? projects[0];
});

// Do ovoga se dolazi samo ako db/projects.sql nije pokrenut (ili su svi
// projekti arhivirani), pa je poruka namenjena administratoru
export const NO_PROJECT_ERROR =
  "Nijedan projekat nije podešen — pokreni db/projects.sql u Supabase SQL editoru.";

// Za stranice koje bez projekta nemaju šta da prikažu. Server akcije umesto
// ovoga koriste checkProjectRole iz lib/dal.ts, koje vraća poruku umesto da
// baca. Početna strana namerno ne koristi ni jedno ni drugo — sa nje se
// jedino i može doći do /admin/projekti.
export async function requireActiveProject(): Promise<Project> {
  const project = await getActiveProject();
  if (!project) throw new Error(NO_PROJECT_ERROR);

  return project;
}
