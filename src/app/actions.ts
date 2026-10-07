"use server";

import { timingSafeEqual } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { SHEET_TAG } from "@/lib/data";
import { createSession, destroySession, requireSession } from "@/lib/session";

export type LoginState = { error?: string };

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!safeEqual(password, env.appPassword)) return { error: "Wrong password." };
  await createSession();
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Re-read the sheet after editing it directly in Google Sheets. */
export async function refreshFromSheet() {
  await requireSession();
  updateTag(SHEET_TAG);
}
