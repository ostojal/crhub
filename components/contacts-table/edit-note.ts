"use server";

import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId } from "@/lib/validate";
import { revalidatePath } from "next/cache";

export async function editNote(
  contactId: number,
  note: string,
): Promise<ActionResult> {
  const me = await checkRole("admin");
  if (!me) return { ok: false, error: "Nemaš dozvolu za ovu akciju." };

  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  const notes = cleanText(note, 2000);

  const supabase = createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ notes })
    .eq("id", contactId);

  if (error) return { ok: false, error: "Greška pri čuvanju beleške." };

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");

  return { ok: true, message: "Beleška je sačuvana." };
}
