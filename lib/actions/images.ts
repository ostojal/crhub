"use server";

import { MAX_INLINE_IMAGE_BYTES } from "@/lib/constants";
import { checkRole } from "@/lib/dal";

// Slike iz nalepljenog Gmail potpisa stoje na Google-ovim serverima. Iz
// pretraživača se ne mogu pročitati (CORS), pa ih povlači server i vraća kao
// data: URL — isto što nastane kad se slika nalepi direktno, a pri slanju
// postaje cid: deo poruke (vidi extractInlineImages).

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

// Google-ovi CDN endpointi na Node-ov podrazumevani user-agent često vraćaju
// 403, pa se predstavljamo kao običan pretraživač
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// Domeni na koje Google preusmerava kad slika traži prijavu
const LOGIN_HOSTS = ["accounts.google.com", "workspace.google.com"];

// Tip se određuje iz sadržaja, ne iz content-type zaglavlja: CDN ume da vrati
// application/octet-stream za pravu sliku, a strana za prijavu vraća HTML sa
// statusom 200. Uz to, SVG (koji može da nosi skript) ne odgovara nijednom
// potpisu i time prirodno otpada.
const MAGIC_NUMBERS: { mimeType: string; bytes: number[] }[] = [
  { mimeType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mimeType: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mimeType: "image/bmp", bytes: [0x42, 0x4d] },
  { mimeType: "image/x-icon", bytes: [0x00, 0x00, 0x01, 0x00] },
];

function sniffMimeType(bytes: Uint8Array): string | null {
  for (const { mimeType, bytes: magic } of MAGIC_NUMBERS) {
    if (magic.every((byte, index) => bytes[index] === byte)) return mimeType;
  }

  // WebP: "RIFF" + 4 bajta dužine + "WEBP"
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";

  return null;
}

// Server povlači adresu koju je zadao klijent, pa se propušta samo javni
// http(s) saobraćaj — bez interne mreže i metadata servisa (SSRF)
function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  // IPv6: loopback i unique local adrese (fc00::/7)
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) {
    return true;
  }

  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!octets) return false;

  const [a, b] = octets.slice(1, 3).map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function publicHttpUrl(value: string, base?: URL): URL | null {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isPrivateHost(url.hostname)) return null;

  return url;
}

export type ImageFetchFailure =
  // adresa nije javna http(s) — odbila je SSRF provera
  | "blocked_url"
  // 401/403 ili preusmerenje na prijavu: slika je vezana za Gmail sesiju
  | "unauthorized"
  | "not_found"
  // odgovor nije slika (najčešće HTML strana za prijavu sa statusom 200)
  | "not_image"
  | "too_large"
  // timeout, DNS, TLS
  | "network";

export type FetchedImage =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: ImageFetchFailure; status?: number };

// Gmail adrese nose ik= (ključ sandučeta) i slične parametre, pa u log ide
// samo host i putanja
function logFailure(url: URL, reason: ImageFetchFailure, status?: number) {
  console.warn(
    `[slike] ${reason}${status ? ` (HTTP ${status})` : ""}: ${url.host}${url.pathname}`,
  );
}

export async function fetchImageAsDataUrl(
  rawUrl: string,
): Promise<FetchedImage> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false, reason: "blocked_url" };

  const target = publicHttpUrl(rawUrl);
  if (!target) return { ok: false, reason: "blocked_url" };

  let url: URL = target;

  // Preusmerenja se prate ručno da bi svaki korak prošao istu proveru
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        headers: { accept: "image/*", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      logFailure(url, "network");
      return { ok: false, reason: "network" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? publicHttpUrl(location, url) : null;

      if (!next) {
        logFailure(url, "unauthorized", response.status);
        return { ok: false, reason: "unauthorized", status: response.status };
      }

      // Preusmerenje na prijavu znači da je slika vezana za Gmail sesiju
      if (LOGIN_HOSTS.includes(next.hostname.toLowerCase())) {
        logFailure(url, "unauthorized", response.status);
        return { ok: false, reason: "unauthorized", status: response.status };
      }

      url = next;
      continue;
    }

    if (!response.ok) {
      const reason =
        response.status === 401 || response.status === 403
          ? "unauthorized"
          : "not_found";

      logFailure(url, reason, response.status);
      return { ok: false, reason, status: response.status };
    }

    const declaredSize = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > MAX_INLINE_IMAGE_BYTES
    ) {
      logFailure(url, "too_large");
      return { ok: false, reason: "too_large" };
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(await response.arrayBuffer());
    } catch {
      logFailure(url, "network");
      return { ok: false, reason: "network" };
    }

    if (bytes.byteLength > MAX_INLINE_IMAGE_BYTES) {
      logFailure(url, "too_large");
      return { ok: false, reason: "too_large" };
    }

    const mimeType = sniffMimeType(bytes);
    if (!mimeType) {
      logFailure(url, "not_image", response.status);
      return { ok: false, reason: "not_image", status: response.status };
    }

    return {
      ok: true,
      dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    };
  }

  logFailure(url, "network");
  return { ok: false, reason: "network" };
}
