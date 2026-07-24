// Gradi RFC 5322 poruku za Gmail API. Telo je uvek text/plain (kompozer je
// obično textarea polje), prilozi idu kao multipart/mixed.
// Rezultat je čist ASCII: zaglavlja su RFC 2047 kodirana, sadržaj base64.

export type MimeAttachment = {
  filename: string;
  mimeType: string;
  content: Uint8Array;
};

export type MimeMessage = {
  from: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  bodyText: string;
  attachments: MimeAttachment[];
};

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

function randomBoundary(): string {
  return `crhub_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function buildMimeMessage(message: MimeMessage): string {
  const headers = [
    `From: ${sanitizeHeader(message.from)}`,
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

  const bodyText = message.bodyText.replace(/\r?\n/g, CRLF);

  if (message.attachments.length === 0) {
    return [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(Buffer.from(bodyText, "utf8")),
      "",
    ].join(CRLF);
  }

  const boundary = randomBoundary();
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(bodyText, "utf8")),
  ];

  for (const attachment of message.attachments) {
    const mimeType =
      sanitizeHeader(attachment.mimeType) || "application/octet-stream";

    parts.push(
      "",
      `--${boundary}`,
      `Content-Type: ${mimeType}; ${nameParams(attachment.filename, "name")}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; ${nameParams(attachment.filename, "filename")}`,
      "",
      wrapBase64(attachment.content),
    );
  }

  parts.push("", `--${boundary}--`, "");

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    ...parts,
  ].join(CRLF);
}
