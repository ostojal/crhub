"use server";

import {
  COMMUNICATION_STATUSES,
  INTERACTION_TYPES,
  INTEREST_TAGS,
} from "@/lib/constants";
import { setContactStatus } from "@/lib/contact-status";
import { checkRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cleanText, isId, isOneOf } from "@/lib/validate";
import { revalidatePath } from "next/cache";

const NO_PERMISSION = "Nemaš dozvolu za ovu akciju.";

export type LogInteractionInput = {
  contactId: number;
  type: string;
  notes?: string;
  newStatus?: string;
  interestTag?: string;
};

export async function logInteraction(
  input: LogInteractionInput,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  const { contactId } = input;
  if (!isId(contactId)) return { ok: false, error: "Nepoznat kontakt." };

  if (!isOneOf(input.type, INTERACTION_TYPES)) {
    return { ok: false, error: "Nepoznat tip kontaktiranja." };
  }

  const newStatus = input.newStatus;
  if (newStatus !== undefined && !isOneOf(newStatus, COMMUNICATION_STATUSES)) {
    return { ok: false, error: "Nepoznat status." };
  }

  const interestTag = input.interestTag;
  if (interestTag !== undefined && !isOneOf(interestTag, INTEREST_TAGS)) {
    return { ok: false, error: "Nepoznata oznaka." };
  }

  const notes = cleanText(input.notes, 2000);

  const supabase = createClient();

  // User sme da evidentira samo za kontakt koji mu je dodeljen
  if (me.role === "user") {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("id")
      .eq("contact_id", contactId)
      .eq("user_id", me.id)
      .limit(1)
      .maybeSingle();

    if (!assignment) return { ok: false, error: NO_PERMISSION };
  }

  const { error } = await supabase.from("interactions").insert({
    contact_id: contactId,
    user_id: me.id,
    type: input.type,
    notes,
  });

  if (error) {
    return { ok: false, error: "Greška pri evidentiranju kontaktiranja." };
  }

  if (newStatus !== undefined || interestTag !== undefined) {
    const statusOk = await setContactStatus(
      supabase,
      contactId,
      {
        ...(newStatus !== undefined && { communication_status: newStatus }),
        ...(interestTag !== undefined && { interest_tag: interestTag }),
      },
      me.email,
    );

    if (!statusOk) {
      return {
        ok: false,
        error: "Kontaktiranje je zabeleženo, ali status nije izmenjen.",
      };
    }
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");

  return { ok: true, message: "Kontaktiranje je evidentirano." };
}
