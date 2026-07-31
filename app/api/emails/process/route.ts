import { processDueEmails } from "@/lib/email/send";
import { promoteDueFollowUps } from "@/lib/follow-up";
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

// Cron radi svakog minuta zbog zakazanih mejlova, ali rok za follow up se meri
// u danima — dovoljno je jednom na sat. Prozor od 5 minuta znači da propao
// poziv ne preskače ceo sat.
function isFollowUpTurn(now = new Date()): boolean {
  return now.getMinutes() < 5;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processDueEmails();

  // Isti poziv nosi i podsetnike za follow up — nema potrebe za drugim cron
  // poslom. Sekcija na /mejlovi se ionako računa uživo, pa ovaj upis samo
  // upisuje status koji vide tabela kontakata i analitika.
  const { promoted } = isFollowUpTurn()
    ? await promoteDueFollowUps()
    : { promoted: 0 };

  if (result.sent + result.failed + promoted > 0) {
    revalidatePath("/mejlovi");
    revalidatePath("/moji-kontakti");
    revalidatePath("/contacts");
    revalidatePath("/analitika");
  }

  return Response.json({ ...result, promoted });
}
