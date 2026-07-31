"use server";

import { setContactStatus } from "@/lib/contact-status";
import { checkRole, hasContactAccess } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { isId } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

// Aplikacija ne čita Gmail sanduče (traži se samo dozvola za slanje), pa se
// odgovor evidentira ručno — jednim klikom iz sekcije za follow up.
export async function markReplyReceived(
  contactId: number,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };
  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  if (!(await hasContactAccess(me, contactId))) {
    return { ok: false, error: NO_PERMISSION };
  }

  const supabase = createClient();
  const ok = await setContactStatus(
    supabase,
    contactId,
    { communication_status: "Dobijen odgovor" },
    me.email,
  );

  if (!ok) return { ok: false, error: "Greška pri izmeni statusa." };

  revalidatePath("/mejlovi");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");
  revalidatePath("/firme/[company]", "page");

  return { ok: true, message: "Označeno kao dobijen odgovor." };
}
