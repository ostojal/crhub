import "server-only";

import { auth } from "@/auth";
import { ROLES, type Role } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, isOneOf } from "@/lib/validate";
import { redirect } from "next/navigation";
import { cache } from "react";

export type CurrentUser = {
  // users.id (bigint) — koristi se za sve upise u bazu, nikad Google sub
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
};

// auth() dekodira/verifikuje JWT iz cookie-ja; cache() ga dedupira u okviru
// istog requesta (getCurrentUser i requireUser bi ga inače zvali odvojeno).
export const getSession = cache(() => auth());

// Uloga se čita iz baze pri svakom requestu (ne iz JWT-a), pa izmena ili
// ukidanje uloge važi odmah. cache() dedupira pozive unutar istog requesta.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const supabase = createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .ilike("email", escapeLike(email))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!user?.role || !isOneOf(user.role, ROLES)) return null;

  return {
    id: user.id,
    email: user.email ?? email,
    fullName: user.full_name || null,
    role: user.role,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/");

  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");

  return user;
}

// Za server akcije: bez redirecta, null kad pristup ne postoji
export async function checkRole(...roles: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;

  return user;
}

// Admin sme svaki kontakt; user samo kontakt koji mu je dodeljen
export async function requireContactAccess(
  contactId: number,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "admin") return user;

  if (user.role === "user") {
    const supabase = createClient();
    const { data: assignment } = await supabase
      .from("assignments")
      .select("id")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (assignment) return user;
  }

  redirect("/");
}
