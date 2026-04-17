import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token")

  const isLoggedIn = !!token
  const isOnLogin = request.nextUrl.pathname.startsWith("/login")

  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL("/login", request.nextUrl))
  }

  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/", request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
