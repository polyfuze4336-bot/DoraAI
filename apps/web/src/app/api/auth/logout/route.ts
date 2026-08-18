import { NextResponse } from "next/server";

import { sessionCookieName } from "@/lib/auth/session";

export function POST() {
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}