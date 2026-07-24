import "server-only";

// Direktni pozivi Google OAuth i Gmail REST endpointa — potrebna su svega tri
// poziva (razmena koda, obnova tokena, slanje), pa nema razloga za googleapis
// paket od nekoliko megabajta.

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

// CSRF zaštita OAuth toka: state se upisuje u cookie pri kretanju i
// upoređuje u callback-u
export const OAUTH_STATE_COOKIE = "gmail_oauth_state";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
// uploadType=media prima sirov MIME (do 35MB) umesto base64url zapisa u JSON-u
const GMAIL_SEND_ENDPOINT =
  "https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media";

export class GoogleAuthError extends Error {
  constructor(
    readonly code: "invalid_grant" | "other",
    message: string,
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

// Mora se poklapati sa Authorized redirect URI u Google Cloud konzoli
export function googleRedirectUri(): string {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("APP_URL nije podešen.");
  return `${base}/api/google/callback`;
}

function clientCredentials() {
  const id = process.env.AUTH_GOOGLE_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET;
  if (!id || !secret) {
    throw new Error("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET nisu podešeni.");
  }
  return { id, secret };
}

// access_type=offline + prompt=consent garantuju refresh token pri svakom
// povezivanju (bez toga Google ga vraća samo prvi put)
export function buildAuthUrl({
  state,
  loginHint,
}: {
  state: string;
  loginHint: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientCredentials().id,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: `openid email ${GMAIL_SEND_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    state,
    login_hint: loginHint,
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

// id_token stiže direktno sa Google token endpointa preko TLS-a, pa je
// dovoljno pročitati payload (potpis proverava sam kanal)
function readIdTokenEmail(idToken: string | undefined): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { email?: string };
    return claims.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export type ExchangeResult =
  | { ok: true; refreshToken: string; googleEmail: string }
  | { ok: false; error: string };

export async function exchangeCode(code: string): Promise<ExchangeResult> {
  const { id, secret } = clientCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok) {
    return {
      ok: false,
      error: data.error_description ?? data.error ?? "Google je odbio zahtev.",
    };
  }

  if (!data.scope?.includes(GMAIL_SEND_SCOPE)) {
    return {
      ok: false,
      error: "Dozvola za slanje mejlova nije odobrena.",
    };
  }

  if (!data.refresh_token) {
    return {
      ok: false,
      error: "Google nije vratio refresh token. Pokušaj ponovo.",
    };
  }

  const googleEmail = readIdTokenEmail(data.id_token);
  if (!googleEmail) {
    return { ok: false, error: "Google nije vratio email adresu naloga." };
  }

  return { ok: true, refreshToken: data.refresh_token, googleEmail };
}

// Access token živi sat vremena, pa se ne čuva — pravi se pred svako slanje
export async function mintAccessToken(refreshToken: string): Promise<string> {
  const { id, secret } = clientCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !data.access_token) {
    // invalid_grant = korisnik je opozvao pristup ili je token istekao
    // (Testing mod u Google Cloud-u gasi refresh tokene posle 7 dana)
    throw new GoogleAuthError(
      data.error === "invalid_grant" ? "invalid_grant" : "other",
      data.error_description ?? data.error ?? "Neuspešna obnova Gmail tokena.",
    );
  }

  return data.access_token;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => {
    // Best effort: red u bazi se briše bez obzira na odgovor Google-a
  });
}

export type GmailSendResult =
  { ok: true; messageId: string } | { ok: false; error: string };

export async function sendGmailMessage(
  accessToken: string,
  rawMime: string,
): Promise<GmailSendResult> {
  const response = await fetch(GMAIL_SEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "message/rfc822",
    },
    body: rawMime,
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.id) {
    return {
      ok: false,
      error:
        data.error?.message ??
        `Gmail je odbio slanje (HTTP ${response.status}).`,
    };
  }

  return { ok: true, messageId: data.id };
}
