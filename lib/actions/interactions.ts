"use server";

import {
  COMMUNICATION_STATUSES,
  INTERACTION_TYPES,
  INTEREST_TAGS,
  NOTE_TYPE,
} from "@/lib/constants";
import { setContactStatus } from "@/lib/contact-status";
import { checkProjectRole } from "@/lib/dal";
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

// Evidentira isto kontaktiranje za jedan ili više kontakata na aktivnom
// projektu; admin za bilo koji kontakt, user samo za kontakte koji su mu
// dodeljeni
export async function logInteractions(
  contactIds: number[],
  input: LogInteractionInput,
): Promise<ActionResult> {
  const ctx = await checkProjectRole("admin", "user");
  if (!ctx.ok) return ctx;
  const { user: me, project } = ctx;

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

  // Beleška ne menja status ni oznaku, pa i kad ih klijent pošalje — otpadaju
  const isNote = input.type === NOTE_TYPE;

  const newStatus = isNote ? undefined : input.newStatus;
  if (newStatus !== undefined && !isOneOf(newStatus, COMMUNICATION_STATUSES)) {
    return { ok: false, error: "Nepoznat status." };
  }

  const interestTag = isNote ? undefined : input.interestTag;
  if (interestTag !== undefined && !isOneOf(interestTag, INTEREST_TAGS)) {
    return { ok: false, error: "Nepoznata oznaka." };
  }

  const notes = cleanText(input.notes, 2000);

  const supabase = createClient();

  if (me.role === "user") {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("contact_id")
      .eq("project_id", project.id)
      .in("contact_id", contactIds)
      .eq("user_id", me.id);

    const assignedIds = new Set((assignments ?? []).map((a) => a.contact_id));
    if (!contactIds.every((id) => assignedIds.has(id))) {
      return { ok: false, error: NO_PERMISSION };
    }
  }

  const { error } = await supabase.from("interactions").insert(
    contactIds.map((contactId) => ({
      project_id: project.id,
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
        project.id,
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
  // Strana firme prikazuje status i broj kontaktiranja
  revalidatePath("/firme/[company]", "page");

  return {
    ok: true,
    message: isNote
      ? contactIds.length === 1
        ? "Beleška je sačuvana."
        : `Sačuvano beleški: ${contactIds.length}.`
      : contactIds.length === 1
        ? "Kontaktiranje je evidentirano."
        : `Evidentirano kontaktiranja: ${contactIds.length}.`,
  };
}

// Naknadno razvrstavanje: red upisan kao kontaktiranje zapravo je bio beleška
// (ili obrnuto). Menja samo tip — beleške, vreme i autor ostaju.
export async function setInteractionType(
  interactionId: number,
  type: string,
): Promise<ActionResult> {
  const ctx = await checkProjectRole("admin", "user");
  if (!ctx.ok) return ctx;
  const { user: me, project } = ctx;

  if (!isId(interactionId)) return { ok: false, error: "Nepoznat unos." };
  if (!isOneOf(type, INTERACTION_TYPES)) {
    return { ok: false, error: "Nepoznat tip kontaktiranja." };
  }

  const supabase = createClient();

  // Unos sa drugog projekta se ne vidi ni u istoriji, pa se ni ne menja
  const { data: existing } = await supabase
    .from("interactions")
    .select("id, user_id, contact_id")
    .eq("id", interactionId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Unos ne postoji." };

  // Tuđe unose menja samo admin
  if (me.role !== "admin" && existing.user_id !== me.id) {
    return { ok: false, error: NO_PERMISSION };
  }

  const { error } = await supabase
    .from("interactions")
    .update({ type })
    .eq("id", interactionId);

  if (error) return { ok: false, error: "Greška pri izmeni unosa." };

  revalidateInteractionPaths(existing.contact_id);

  return {
    ok: true,
    message:
      type === NOTE_TYPE
        ? "Unos je prebačen u beleške."
        : "Tip unosa je izmenjen.",
  };
}

export async function deleteInteraction(
  interactionId: number,
): Promise<ActionResult> {
  const ctx = await checkProjectRole("admin", "user");
  if (!ctx.ok) return ctx;
  const { user: me, project } = ctx;

  if (!isId(interactionId)) return { ok: false, error: "Nepoznat unos." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("interactions")
    .select("id, user_id, contact_id")
    .eq("id", interactionId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Unos ne postoji." };

  if (me.role !== "admin" && existing.user_id !== me.id) {
    return { ok: false, error: NO_PERMISSION };
  }

  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("id", interactionId);

  if (error) return { ok: false, error: "Greška pri brisanju unosa." };

  revalidateInteractionPaths(existing.contact_id);

  return { ok: true, message: "Unos je obrisan." };
}

function revalidateInteractionPaths(contactId: number | null): void {
  revalidatePath("/");
  revalidatePath("/contacts");
  if (contactId !== null) revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/moji-kontakti");
  revalidatePath("/analitika");
  revalidatePath("/firme/[company]", "page");
}
