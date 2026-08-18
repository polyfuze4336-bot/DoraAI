import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticationProvider } from "@/lib/auth/provider";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const user = await authenticationProvider().authenticate(
    parsed.data.username,
    parsed.data.password,
  );
  if (!user) {
    return NextResponse.json(
      { error: "The email or password is incorrect." },
      { status: 401 },
    );
  }
  const response = NextResponse.json({ user });
  response.cookies.set(
    sessionCookieName,
    await createSessionToken(user, process.env.AUTH_SESSION_SECRET ?? ""),
    sessionCookieOptions,
  );
  return response;
}