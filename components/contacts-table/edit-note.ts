"use server";

import { createClient } from "@/lib/supabase/server";

export async function editNote(contactId: string, note: string) {
  const client = createClient();
  const { error } = await client
    .from("contacts")
    .update({ notes: note.length > 0 ? note.trim() : null })
    .eq("id", contactId);

  if (error) {
    console.error(error);
  }
}
