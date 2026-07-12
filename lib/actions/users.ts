"use server";

import { ROLES, type Role } from "@/lib/constants";
import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { escapeLike, isId, isOneOf, normalizeEmail } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

export async function addUser(
  rawEmail: string,
  role: Role,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Email adresa nije ispravna." };
  if (!isOneOf(role, ROLES)) return { ok: false, error: "Nepoznata uloga." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("email", escapeLike(email))
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Korisnik sa ovim emailom već postoji." };
  }

  const { error } = await supabase.from("users").insert({ email, role });
  if (error) return { ok: false, error: "Greška pri dodavanju korisnika." };

  revalidatePath("/admin/users");
  return { ok: true, message: `Korisnik ${email} je dodat.` };
}

export async function updateUserRole(
  userId: number,
  role: Role | null,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(userId)) return { ok: false, error: "Nepoznat korisnik." };
  if (role !== null && !isOneOf(role, ROLES)) {
    return { ok: false, error: "Nepoznata uloga." };
  }
  if (userId === me.id) {
    return { ok: false, error: "Ne možeš menjati sopstvenu ulogu." };
  }

  const supabase = createClient();

  if (role !== "admin") {
    const { data: target } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!target) return { ok: false, error: "Korisnik ne postoji." };

    if (target.role === "admin") {
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count ?? 0) <= 1) {
        return {
          ok: false,
          error: "Ne možeš ukloniti poslednjeg administratora.",
        };
      }
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) return { ok: false, error: "Greška pri izmeni uloge." };

  revalidatePath("/admin/users");
  return { ok: true, message: "Uloga je izmenjena." };
}

export async function deleteUser(userId: number): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (!isId(userId)) return { ok: false, error: "Nepoznat korisnik." };
  if (userId === me.id) {
    return { ok: false, error: "Ne možeš obrisati sopstveni nalog." };
  }

  const supabase = createClient();

  const { count } = await supabase
    .from("interactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Korisnik ima evidentirane interakcije — umesto brisanja ukloni mu pristup.",
    };
  }

  const { error: assignmentsError } = await supabase
    .from("assignments")
    .delete()
    .eq("user_id", userId);

  if (assignmentsError) {
    return { ok: false, error: "Greška pri brisanju dodela korisnika." };
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { ok: false, error: "Greška pri brisanju korisnika." };

  revalidatePath("/admin/users");
  revalidatePath("/contacts");
  return { ok: true, message: "Korisnik je obrisan." };
}
