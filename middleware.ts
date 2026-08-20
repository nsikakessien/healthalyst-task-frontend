import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Read the HTTP-only auth token directly from incoming request cookies
  const token = request.cookies.get("jwt_token")?.value;
  const { pathname } = request.nextUrl;

  // Protected paths that require authentication
  const isProtectedPath =
    pathname.startsWith("/clinics") || pathname.startsWith("/book");

  // If visiting a protected page without a cookie, redirect instantly to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access /login, redirect to /clinics
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/clinics", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clinics/:path*", "/book/:path*", "/login"],
};
