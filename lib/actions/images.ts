"use server";

import { MAX_INLINE_IMAGE_BYTES } from "@/lib/constants";
import { checkRole } from "@/lib/dal";

// Slike iz nalepljenog Gmail potpisa stoje na Google-ovim serverima. Iz
// pretraživača se ne mogu pročitati (CORS), pa ih povlači server i vraća kao
// data: URL — isto što nastane kad se slika nalepi direktno, a pri slanju
// postaje cid: deo poruke (vidi extractInlineImages).

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

// SVG može da nosi skript; ostaje van editora jer potpis ide dalje u mejl
const BLOCKED_MIME_TYPES = ["image/svg+xml"];

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

export type FetchedImage = { ok: true; dataUrl: string } | { ok: false };

export async function fetchImageAsDataUrl(
  rawUrl: string,
): Promise<FetchedImage> {
  const me = await checkRole("admin", "user");
  if (!me) return { ok: false };

  const target = publicHttpUrl(rawUrl);
  if (!target) return { ok: false };

  let url: URL = target;

  // Preusmerenja se prate ručno da bi svaki korak prošao istu proveru
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        headers: { accept: "image/*" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return { ok: false };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? publicHttpUrl(location, url) : null;
      if (!next) return { ok: false };

      url = next;
      continue;
    }

    // Najčešći slučaj neuspeha: slika je vezana za Gmail sesiju i bez nje
    // vraća preusmerenje na prijavu ili 403
    if (!response.ok) return { ok: false };

    const mimeType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!mimeType.startsWith("image/")) return { ok: false };
    if (BLOCKED_MIME_TYPES.includes(mimeType)) return { ok: false };

    const declaredSize = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > MAX_INLINE_IMAGE_BYTES
    ) {
      return { ok: false };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_INLINE_IMAGE_BYTES) return { ok: false };

    return {
      ok: true,
      dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    };
  }

  return { ok: false };
}
