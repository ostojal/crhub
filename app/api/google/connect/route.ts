import { getCurrentUser } from "@/lib/dal";
import { buildAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/email/google";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// proxy.ts ne pokriva /api, pa se pristup ovde proverava direktno
export async function GET(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "admin" && me.role !== "user")) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  const state = randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  // login_hint otvara Google-ov izbor naloga već na pravom mejlu; poklapanje
  // se svejedno proverava u callback-u
  return NextResponse.redirect(buildAuthUrl({ state, loginHint: me.email }));
}
