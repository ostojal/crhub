import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Gmail refresh token je dugoživeća tajna, pa se u bazu upisuje šifrovan:
// dump baze ili pogled kroz Supabase dashboard ne otkriva ništa upotrebljivo.
const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error("GOOGLE_TOKEN_ENC_KEY nije podešen.");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENC_KEY mora biti 32 bajta zapisana u base64 (openssl rand -base64 32).",
    );
  }

  return key;
}

// Zapis: v1:<iv>:<tag>:<ciphertext>, svi delovi base64
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Neispravan zapis šifrovanog tokena.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
