import { getCurrentUser } from "@/lib/dal";
import { encryptSecret } from "@/lib/email/crypto";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/email/google";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Razlog neuspeha se prenosi kroz ?gmail=..., a pun tekst greške ide u log
// servera — inače svaki neuspeh izgleda isto i ne zna se šta da se popravi
type Outcome = "connected" | "denied" | "state" | "google" | "mismatch" | "db";

function back(request: NextRequest, outcome: Outcome) {
  return NextResponse.redirect(
    new URL(`/mejlovi?gmail=${outcome}`, request.nextUrl),
  );
}

export async function GET(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "admin" && me.role !== "user")) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const code = params.get("code");

  const googleError = params.get("error");
  if (googleError) {
    console.error(`[gmail] Google je odbio zahtev: ${googleError}`);
    return back(request, "denied");
  }

  // CSRF zaštita: state iz cookie-ja mora da odgovara onom koji vraća Google
  if (!code || !state || state !== expectedState) {
    console.error("[gmail] Neispravan ili istekao state parametar.");
    return back(request, "state");
  }

  const exchange = await exchangeCode(code);
  if (!exchange.ok) {
    console.error(`[gmail] Razmena koda nije uspela: ${exchange.error}`);
    return back(request, "google");
  }

  // Povezivanje tuđeg sandučeta bi značilo slanje u tuđe ime — odbija se
  // pre nego što se ijedan token upiše
  if (exchange.googleEmail !== me.email.toLowerCase()) {
    return back(request, "mismatch");
  }

  const supabase = createClient();
  const { error } = await supabase.from("google_tokens").upsert(
    {
      user_id: me.id,
      google_email: exchange.googleEmail,
      refresh_token_enc: encryptSecret(exchange.refreshToken),
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error(`[gmail] Upis tokena nije uspeo: ${error.message}`);
    return back(request, "db");
  }

  return back(request, "connected");
}
