import { getCurrentUser } from "@/lib/dal";
import { encryptSecret } from "@/lib/email/crypto";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/email/google";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function back(request: NextRequest, result: string) {
  return NextResponse.redirect(
    new URL(`/mejlovi?gmail=${result}`, request.nextUrl),
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

  // Korisnik je odbio pristup ili state ne odgovara (CSRF zaštita)
  if (params.get("error") || !code || !state || state !== expectedState) {
    return back(request, "error");
  }

  const exchange = await exchangeCode(code);
  if (!exchange.ok) return back(request, "error");

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

  if (error) return back(request, "error");

  return back(request, "connected");
}
