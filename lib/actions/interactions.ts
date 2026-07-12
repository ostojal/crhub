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
const MAX_BULK = 25;

export type LogInteractionInput = {
  type: string;
  notes?: string;
  newStatus?: string;
  interestTag?: string;
};

// Evidentira isto kontaktiranje za jedan ili više kontakata; admin za bilo
// koji kontakt, user samo za kontakte koji su mu dodeljeni
export async function logInteractions(
  contactIds: number[],
  input: LogInteractionInput,
): Promise<ActionResult> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, error: NO_PERMISSION };

  if (
    !Array.isArray(contactIds) ||
    contactIds.length === 0 ||
    contactIds.length > MAX_BULK ||
    !contactIds.every(isId)
  ) {
    return { ok: false, error: "Neispravan izbor kontakata." };
  }

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

  if (me.role === "user") {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("contact_id")
      .in("contact_id", contactIds)
      .eq("user_id", me.id);

    const assignedIds = new Set(
      (assignments ?? []).map((a) => a.contact_id),
    );
    if (!contactIds.every((id) => assignedIds.has(id))) {
      return { ok: false, error: NO_PERMISSION };
    }
  }

  const { error } = await supabase.from("interactions").insert(
    contactIds.map((contactId) => ({
      contact_id: contactId,
      user_id: me.id,
      type: input.type,
      notes,
    })),
  );

  if (error) {
    return { ok: false, error: "Greška pri evidentiranju kontaktiranja." };
  }

  if (newStatus !== undefined || interestTag !== undefined) {
    for (const contactId of contactIds) {
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
  }

  revalidatePath("/");
  revalidatePath("/contacts");
  for (const contactId of contactIds) {
    revalidatePath(`/contacts/${contactId}`);
  }
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");

  return {
    ok: true,
    message:
      contactIds.length === 1
        ? "Kontaktiranje je evidentirano."
        : `Evidentirano kontaktiranja: ${contactIds.length}.`,
  };
}
