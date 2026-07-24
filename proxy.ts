import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Stranice koje moraju da rade bez prijave: početna objašnjava čemu
// aplikacija služi, a politika privatnosti opisuje rad sa podacima —
// oboje traži Google pri verifikaciji OAuth aplikacije.
const PUBLIC_PATHS = ["/", "/privatnost"];

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;
  const isOnLogin = pathname.startsWith("/login");
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!isLoggedIn && !isOnLogin && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
