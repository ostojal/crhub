import "server-only";

import type {
  CommunicationStatus,
  Database,
  InterestTag,
} from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusPatch = {
  communication_status?: CommunicationStatus;
  interest_tag?: InterestTag | null;
};

// Logički jedan red statusa po kontaktu: ako red postoji, menja se najnoviji;
// inače se ubacuje novi. Sva čitanja tretiraju najnoviji red kao aktuelan.
export async function setContactStatus(
  supabase: SupabaseClient<Database>,
  contactId: number,
  patch: StatusPatch,
  updatedBy: string,
): Promise<boolean> {
  if (
    patch.communication_status === undefined &&
    patch.interest_tag === undefined
  ) {
    return true;
  }

  const { data: existing } = await supabase
    .from("contact_status")
    .select("id")
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("contact_status")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq("id", existing.id);

    return !error;
  }

  const { error } = await supabase.from("contact_status").insert({
    contact_id: contactId,
    communication_status: patch.communication_status ?? null,
    interest_tag: patch.interest_tag ?? null,
    updated_by: updatedBy,
  });

  return !error;
}
