import { processDueEmails } from "@/lib/email/send";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

// Slanje jedne serije mejlova sa prilozima ume da potraje
export const maxDuration = 60;

// Cron je van sesije (poziva ga Supabase pg_cron), pa se autentifikuje tajnom
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processDueEmails();

  if (result.sent + result.failed > 0) {
    revalidatePath("/mejlovi");
    revalidatePath("/moji-kontakti");
    revalidatePath("/contacts");
    revalidatePath("/analitika");
  }

  return Response.json(result);
}
