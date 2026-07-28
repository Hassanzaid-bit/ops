import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/session-token";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginRoute = path === "/login";

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(cookie);

  if (!isLoginRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
