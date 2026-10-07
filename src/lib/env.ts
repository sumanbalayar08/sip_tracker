function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

/** Accepts the raw PEM (with literal \n) or the PEM base64-encoded. */
function privateKey(): string {
  const raw = required("GOOGLE_SA_KEY").trim();
  if (raw.includes("BEGIN PRIVATE KEY")) return raw.replace(/\\n/g, "\n");
  return Buffer.from(raw, "base64").toString("utf8");
}

export const env = {
  get serviceAccountEmail() {
    return required("GOOGLE_SA_EMAIL");
  },
  get serviceAccountKey() {
    return privateKey();
  },
  get sheetId() {
    return required("SHEET_ID");
  },
  get sessionPassword() {
    const v = required("SESSION_PASSWORD");
    if (v.length < 32) throw new Error("SESSION_PASSWORD must be at least 32 characters.");
    return v;
  },
  get appPassword() {
    return required("APP_PASSWORD");
  },
};
