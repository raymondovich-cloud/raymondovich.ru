export type IntakeSource = "tg" | "ig" | "threads" | "site" | "other";

export type VerifiedTelegramInitData = {
  user: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  authDate: number;
  startParam: string | null;
};

export class IntakeValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "IntakeValidationError";
  }
}

const encoder = new TextEncoder();
const SOURCE_PATTERN = /^(tg|ig|threads|site)(?:_([a-z0-9]{1,24}))?$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{5,32}$/;
const LANGUAGE_PATTERN = /^[A-Za-z0-9-]{2,16}$/;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalHexConstantTime(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmacSha256(keyBytes: Uint8Array, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function validateTelegramInitData(
  rawInitData: string,
  botToken: string,
  nowMs = Date.now(),
): Promise<VerifiedTelegramInitData> {
  if (typeof rawInitData !== "string" || rawInitData.length < 1 || rawInitData.length > 8192) {
    throw new IntakeValidationError("invalid_init_data");
  }
  if (!botToken) throw new IntakeValidationError("server_configuration_error");

  const params = new URLSearchParams(rawInitData);
  const entries = [...params.entries()];
  if (entries.length === 0) throw new IntakeValidationError("invalid_init_data");

  const seen = new Set<string>();
  for (const [key] of entries) {
    if (seen.has(key)) throw new IntakeValidationError("invalid_init_data");
    seen.add(key);
  }

  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new IntakeValidationError("invalid_init_data");
  }

  const checkString = entries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Telegram's bot-token validation: HMAC key is "WebAppData", message is the bot token.
  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const calculatedHash = bytesToHex(await hmacSha256(secretKey, checkString));
  if (!equalHexConstantTime(calculatedHash, receivedHash.toLowerCase())) {
    throw new IntakeValidationError("invalid_init_data");
  }

  const authDate = Number(params.get("auth_date"));
  const nowSeconds = Math.floor(nowMs / 1000);
  if (!Number.isSafeInteger(authDate) || authDate <= 0 || authDate > nowSeconds + 60 || nowSeconds - authDate > 86400) {
    throw new IntakeValidationError("expired_init_data");
  }

  let user: VerifiedTelegramInitData["user"];
  try {
    user = JSON.parse(params.get("user") || "");
  } catch {
    throw new IntakeValidationError("invalid_telegram_user");
  }

  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || user.id > 2 ** 52) {
    throw new IntakeValidationError("invalid_telegram_user");
  }

  return {
    user: {
      id: user.id,
      ...(typeof user.first_name === "string" ? { first_name: user.first_name } : {}),
      ...(typeof user.last_name === "string" ? { last_name: user.last_name } : {}),
      ...(typeof user.username === "string" && USERNAME_PATTERN.test(user.username)
        ? { username: user.username }
        : {}),
      ...(typeof user.language_code === "string" && LANGUAGE_PATTERN.test(user.language_code)
        ? { language_code: user.language_code }
        : {}),
    },
    authDate,
    startParam: params.get("start_param"),
  };
}

export function parseIntakeSource(startParam: string | null | undefined): {
  source: IntakeSource;
  campaign: string | null;
} {
  if (!startParam) return { source: "other", campaign: null };
  const match = SOURCE_PATTERN.exec(startParam);
  if (!match) return { source: "other", campaign: null };
  return {
    source: match[1] as IntakeSource,
    campaign: match[2] || null,
  };
}

export function normalizeText(
  value: unknown,
  maximum: number,
  field: "name" | "message",
): string {
  if (typeof value !== "string") throw new IntakeValidationError(`invalid_${field}`);
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  const forbiddenControls = field === "message"
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
    : /[\u0000-\u001F\u007F]/;
  if (forbiddenControls.test(normalized)) throw new IntakeValidationError(`invalid_${field}`);
  const length = [...normalized].length;
  if (length < 1 || length > maximum) throw new IntakeValidationError(`invalid_${field}`);
  return normalized;
}

export function escapeTelegramHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export function normalizeClientPlatform(value: unknown): string {
  const allowed = new Set(["ios", "android", "macos", "tdesktop", "weba", "webk", "unigram"]);
  return typeof value === "string" && allowed.has(value) ? value : "unknown";
}

export function escapeTelegramHtmlTruncated(value: unknown, maximumEscapedLength = 2200): string {
  let output = "";
  for (const character of String(value)) {
    const escaped = escapeTelegramHtml(character);
    if (output.length + escaped.length > maximumEscapedLength) return output + "…";
    output += escaped;
  }
  return output;
}

export function resolveIntakeStartParam(
  signedStartParam: string | null,
  clientStartParam: unknown,
): { value: string | null; signed: boolean } {
  if (signedStartParam !== null && signedStartParam.length > 0) {
    return { value: signedStartParam, signed: true };
  }
  if (typeof clientStartParam === "string" && clientStartParam.length <= 64) {
    return { value: clientStartParam, signed: false };
  }
  return { value: null, signed: false };
}
