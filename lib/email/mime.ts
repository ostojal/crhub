// Gradi RFC 5322 poruku za Gmail API.
// Struktura zavisi od sadržaja:
//   text/plain                                   — samo tekst
//   multipart/alternative (plain + html)         — formatiran tekst
//   multipart/related     (alternative + slike)  — nalepljene slike (cid:)
//   multipart/mixed       (… + prilozi)          — kad ima priloga
// Rezultat je čist ASCII: zaglavlja su RFC 2047 kodirana, sadržaj base64.

import type { InlineImage } from "./html";

export type MimeAttachment = {
  filename: string;
  mimeType: string;
  content: Uint8Array;
};

export type MimeMessage = {
  from: string;
  // Ime koje primalac vidi umesto gole adrese
  fromName?: string | null;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  // Tekstualna verzija; jedina verzija ako bodyHtml izostane
  bodyText: string;
  bodyHtml?: string | null;
  inlineImages?: InlineImage[];
  attachments: MimeAttachment[];
};

// Jedan MIME deo: sopstvena zaglavlja i telo
type Part = { headers: string[]; body: string };

const CRLF = "\r\n";

// Nova linija u vrednosti zaglavlja je klasična injekcija dodatnih zaglavlja
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isPrintableAscii(value: string): boolean {
  return /^[\x20-\x7E]*$/.test(value);
}

// Jedna encoded-word sme da bude najviše 75 znakova; uz "=?UTF-8?B?" i "?="
// ostaje 63 base64 znaka, tj. 45 izvornih bajtova
function splitByBytes(value: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const size = Buffer.byteLength(char, "utf8");
    if (currentBytes + size > maxBytes && current) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }

  if (current) chunks.push(current);
  return chunks;
}

function encodeHeaderValue(value: string): string {
  const clean = sanitizeHeader(value);
  if (isPrintableAscii(clean)) return clean;

  return splitByBytes(clean, 45)
    .map(
      (chunk) => `=?UTF-8?B?${Buffer.from(chunk, "utf8").toString("base64")}?=`,
    )
    .join(`${CRLF} `);
}

function wrapBase64(content: Uint8Array | string): string {
  const base64 = Buffer.from(content as Uint8Array).toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    lines.push(base64.slice(i, i + 76));
  }
  return lines.join(CRLF);
}

// Ne-ASCII imena fajlova idu kroz RFC 2231 (name*/filename*), uz ASCII rezervu
function nameParams(filename: string, key: "name" | "filename"): string {
  const clean = sanitizeHeader(filename) || "prilog";
  const ascii = clean.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const params = `${key}="${ascii}"`;

  return ascii === clean
    ? params
    : `${params}; ${key}*=UTF-8''${encodeURIComponent(clean)}`;
}

// "Ime Prezime <adresa>" — bez ovoga primalac vidi samo golu adresu.
// Ne-ASCII ime ide kao encoded-word (i tada se ne navodi pod navodnicima).
function formatAddress(email: string, name?: string | null): string {
  const address = sanitizeHeader(email);
  const display = sanitizeHeader(name ?? "");
  if (!display) return address;

  return isPrintableAscii(display)
    ? `"${display.replace(/["\\]/g, "")}" <${address}>`
    : `${encodeHeaderValue(display)} <${address}>`;
}

function randomBoundary(): string {
  return `crhub_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function renderPart(part: Part): string {
  return [...part.headers, "", part.body].join(CRLF);
}

function multipart(subtype: string, parts: Part[], typeParams = ""): Part {
  const boundary = randomBoundary();
  const lines: string[] = [];

  for (const part of parts) {
    lines.push(`--${boundary}`, renderPart(part));
  }
  lines.push(`--${boundary}--`);

  return {
    headers: [
      `Content-Type: multipart/${subtype}; boundary="${boundary}"${typeParams}`,
    ],
    body: lines.join(CRLF),
  };
}

function textPart(text: string): Part {
  return {
    headers: [
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    ],
    body: wrapBase64(Buffer.from(text.replace(/\r?\n/g, CRLF), "utf8")),
  };
}

function htmlPart(html: string): Part {
  return {
    headers: [
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    ],
    body: wrapBase64(Buffer.from(html, "utf8")),
  };
}

// Slika iz tela poruke; klijent je prikazuje preko cid: reference
function inlineImagePart(image: InlineImage): Part {
  return {
    headers: [
      `Content-Type: ${sanitizeHeader(image.mimeType) || "image/png"}`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${sanitizeHeader(image.cid)}>`,
      "Content-Disposition: inline",
    ],
    body: wrapBase64(image.content),
  };
}

function attachmentPart(attachment: MimeAttachment): Part {
  const mimeType =
    sanitizeHeader(attachment.mimeType) || "application/octet-stream";

  return {
    headers: [
      `Content-Type: ${mimeType}; ${nameParams(attachment.filename, "name")}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; ${nameParams(attachment.filename, "filename")}`,
    ],
    body: wrapBase64(attachment.content),
  };
}

export function buildMimeMessage(message: MimeMessage): string {
  const headers = [
    `From: ${formatAddress(message.from, message.fromName)}`,
    `To: ${sanitizeHeader(message.to)}`,
  ];

  if (message.cc.length > 0) {
    headers.push(`Cc: ${message.cc.map(sanitizeHeader).join(", ")}`);
  }
  // Gmail koristi Bcc za isporuku i uklanja ga iz poruka koje primaoci vide
  if (message.bcc.length > 0) {
    headers.push(`Bcc: ${message.bcc.map(sanitizeHeader).join(", ")}`);
  }

  headers.push(`Subject: ${encodeHeaderValue(message.subject)}`);
  headers.push("MIME-Version: 1.0");

  const images = message.inlineImages ?? [];

  // Tekst uz HTML: klijenti koji ne prikazuju HTML dobijaju čitljivu verziju
  let root: Part = message.bodyHtml
    ? multipart("alternative", [
        textPart(message.bodyText),
        htmlPart(message.bodyHtml),
      ])
    : textPart(message.bodyText);

  if (message.bodyHtml && images.length > 0) {
    root = multipart(
      "related",
      [root, ...images.map(inlineImagePart)],
      '; type="multipart/alternative"',
    );
  }

  if (message.attachments.length > 0) {
    root = multipart("mixed", [
      root,
      ...message.attachments.map(attachmentPart),
    ]);
  }

  return [...headers, ...root.headers, "", root.body, ""].join(CRLF);
}
