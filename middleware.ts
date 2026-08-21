import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeToken(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

export function middleware(request: NextRequest) {
  // Read the HTTP-only auth token directly from incoming request cookies
  const token = request.cookies.get("jwt_token")?.value;
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith("/admin");
  const isProtectedPath =
    pathname.startsWith("/clinics") ||
    pathname.startsWith("/book") ||
    isAdminPath;

  if (token) {
    try {
      const payload = decodeToken(token);
      if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("jwt_token");
        return response;
      }
    } catch {
      if (isProtectedPath || pathname === "/login") {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // If visiting a protected page without a cookie, redirect instantly to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("portal", isAdminPath ? "admin" : "patient");
    return NextResponse.redirect(loginUrl);
  }

  if (token) {
    try {
      const payload = decodeToken(token);
      if (isAdminPath && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/clinics", request.url));
      }
      if (!isAdminPath && isProtectedPath && payload.role !== "PATIENT") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(
        new URL("/login?redirect=/admin/dashboard", request.url),
      );
    }
  }

  // If already authenticated and trying to access /login, redirect to /clinics
  if (pathname === "/login" && token) {
    try {
      const payload = decodeToken(token);
      return NextResponse.redirect(
        new URL(
          payload.role === "ADMIN" ? "/admin/dashboard" : "/clinics",
          request.url,
        ),
      );
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clinics/:path*", "/book/:path*", "/admin/:path*", "/login"],
};
