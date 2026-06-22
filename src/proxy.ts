import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-super-secret-key-that-is-very-long"
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Protect Admin Pages
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/menu", request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect Student Menu Pages
  if (pathname.startsWith("/menu")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== "student") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect if logged in
  if (pathname === "/login") {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        } else if (payload.role === "student") {
          return NextResponse.redirect(new URL("/menu", request.url));
        }
      } catch (err) {
        // invalid token, let them log in
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/menu/:path*", "/login"],
};
