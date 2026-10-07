import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sealData, unsealData } from "iron-session";
import { env } from "./env";

export const SESSION_COOKIE = "sip_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type Session = { authed?: boolean };

export async function createSession() {
  const sealed = await sealData({ authed: true } satisfies Session, {
    password: env.sessionPassword,
    ttl: MAX_AGE,
  });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  await connection(); // unsealing checks the clock; keep it at request time
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  try {
    const s = await unsealData<Session>(cookie, { password: env.sessionPassword, ttl: MAX_AGE });
    return s.authed === true;
  } catch {
    return false;
  }
}

/** Call at the top of every protected server component and action. */
export async function requireSession() {
  if (!(await isAuthed())) redirect("/login");
}
