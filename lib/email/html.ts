// Telo mejla, potpis i šabloni se čuvaju kao HTML (bold, veličina fonta,
// slike…). Modul dele klijent i server, pa ovde ne sme "server-only".

// Stariji zapisi (i ručno kucan tekst) nemaju tagove — prepoznaju se da bi
// se prelomi redova sačuvali pri prikazu i slanju
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

// Čisto tekstualna verzija ide kao multipart/alternative fallback za klijente
// koji ne prikazuju HTML
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Sadržaj pišu prijavljeni članovi tima, ali se vraća u editor i šalje dalje,
// pa se uklanja sve izvršno. Inline `style` ostaje — na njemu počiva
// formatiranje.
// Prvo se uklanjaju elementi zajedno sa sadržajem (da tekst iz <script> ne
// ostane vidljiv), pa onda i eventualni usamljeni tagovi
const DANGEROUS_ELEMENTS = "script|style|iframe|object|embed|form|base";
const DANGEROUS_PAIRS = new RegExp(
  `<(${DANGEROUS_ELEMENTS})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  "gi",
);
const DANGEROUS_TAGS = new RegExp(
  `<\\/?(${DANGEROUS_ELEMENTS}|link|meta)\\b[^>]*>`,
  "gi",
);

export function sanitizeEmailHtml(html: string): string {
  return (
    html
      .replace(DANGEROUS_PAIRS, "")
      .replace(DANGEROUS_TAGS, "")
      // on* handleri (onclick, onerror…), sa navodnicima ili bez njih
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
      .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
      .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'")
  );
}

// Prazno je i "<div><br></div>" — provera gleda tekst i slike, ne markup
export function isEmptyHtml(html: string): boolean {
  return !htmlToText(html) && !/<img\s/i.test(html);
}

// Slike u sadržaju nalepljenom iz drugog mejl klijenta (npr. Gmail potpis)
// ostaju na tuđem serveru. Te adrese traže prijavu koju pretraživač ovde
// nema, pa se slika prikazuje kao prekinuta — zato se pri lepljenju
// zamenjuju data: URL-om (vidi lib/actions/images.ts).
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const IMG_SRC_PATTERN = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

// Adresa u atributu je HTML-kodirana (Gmail piše `&amp;` između parametara),
// a mrežni poziv traži pravu adresu
function decodeAttribute(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function encodeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function tagSource(tag: string): string {
  const match = tag.match(IMG_SRC_PATTERN);
  return decodeAttribute(match?.[1] ?? match?.[2] ?? "");
}

export function isRemoteImageSource(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

export function imageSources(html: string): string[] {
  return (html.match(IMG_TAG_PATTERN) ?? []).map(tagSource).filter(Boolean);
}

// `replace` vraća novu adresu, ili null da se slika izbaci iz teksta
export function mapImageSources(
  html: string,
  replace: (src: string) => string | null,
): string {
  return html.replace(IMG_TAG_PATTERN, (tag) => {
    const src = tagSource(tag);
    const next = replace(src);

    if (next === null) return "";
    if (next === src) return tag;
    return tag.replace(IMG_SRC_PATTERN, () => `src="${encodeAttribute(next)}"`);
  });
}

export type InlineImage = {
  cid: string;
  mimeType: string;
  content: Uint8Array;
};

const DATA_IMAGE_PATTERN =
  /src\s*=\s*"data:(image\/[a-z0-9.+-]+);base64,([^"]+)"/gi;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Nalepljene slike stižu kao data: URL. Mejl klijenti ih uglavnom blokiraju,
// pa se pretvaraju u zasebne MIME delove i referišu preko cid:.
export function extractInlineImages(html: string): {
  html: string;
  images: InlineImage[];
} {
  const images: InlineImage[] = [];

  const result = html.replace(
    DATA_IMAGE_PATTERN,
    (_match, mimeType: string, base64: string) => {
      const cid = `img${images.length + 1}.${Date.now().toString(36)}@crhub`;

      try {
        images.push({ cid, mimeType, content: base64ToBytes(base64) });
      } catch {
        // Neispravan zapis slike — bolje je izgubiti sliku nego ceo mejl
        return 'src=""';
      }

      return `src="cid:${cid}"`;
    },
  );

  return { html: result, images };
}

export function inlineImageBytes(html: string): number {
  let total = 0;
  for (const match of html.matchAll(DATA_IMAGE_PATTERN)) {
    // base64 je oko 4/3 veličine originala
    total += Math.floor((match[2].length * 3) / 4);
  }
  return total;
}
