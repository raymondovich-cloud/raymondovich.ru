import {
  escapeTelegramHtml,
  escapeTelegramHtmlTruncated,
  IntakeValidationError,
  normalizeClientPlatform,
  normalizeText,
  parseIntakeSource,
  resolveIntakeStartParam,
  validateTelegramInitData,
} from "../_shared/intake.ts";
import type { VerifiedTelegramInitData } from "../_shared/intake.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SECRET_KEYS_RAW = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
let DEFAULT_SECRET_KEY = "";
try {
  DEFAULT_SECRET_KEY = JSON.parse(SECRET_KEYS_RAW).default ?? "";
} catch {
  DEFAULT_SECRET_KEY = "";
}
const SERVICE_KEY = DEFAULT_SECRET_KEY || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID") ?? "";
const INTAKE_ENABLED = Deno.env.get("INTAKE_ENABLED") === "true";

const allowedOrigins = new Set([
  "https://raymondovich.ru",
  "https://www.raymondovich.ru",
  "https://raymondovich.online",
  "https://www.raymondovich.online",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sourceLabel(source: string): string {
  return ({
    tg: "Telegram",
    ig: "Instagram",
    threads: "Threads",
    site: "Сайт",
    other: "Другое",
  } as Record<string, string>)[source] || "Другое";
}

function interestLabel(interest: string): string {
  return ({
    partner: "Партнёрство",
    own_product: "Свой продукт",
    question: "Вопрос",
  } as Record<string, string>)[interest] || "Не указано";
}

function moscowDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeValidationError("invalid_request");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 16384) {
      try {
        await reader.cancel();
      } catch {
        // The size limit remains enforced even if the request stream cannot be cancelled.
      }
      throw new IntakeValidationError("request_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new IntakeValidationError("invalid_request");
  }
  return parsed as Record<string, unknown>;
}

function serviceRequestHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  // Supabase sb_secret_* keys belong in apikey, not Authorization. Legacy service-role JWTs need Bearer.
  if (!SERVICE_KEY.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${SERVICE_KEY}`;
  }
  return headers;
}

async function databaseRpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceRequestHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = "";
    try {
      message = JSON.parse(text).message || "";
    } catch {
      message = "";
    }
    if (message.includes("INTAKE_RATE_LIMIT")) throw new IntakeValidationError("rate_limited");
    if (message.includes("INTAKE_INVALID_ARGUMENT")) throw new IntakeValidationError("invalid_request");
    throw new Error("database_write_failed");
  }
  return text ? JSON.parse(text) : null;
}

async function updateNotificationStatus(
  applicationId: string,
  status: "notified" | "notify_failed",
): Promise<void> {
  const patch = status === "notified"
    ? { status, notified_at: new Date().toISOString(), notify_error: null }
    : { status, notify_error: "telegram_send_failed" };
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake_applications?id=eq.${encodeURIComponent(applicationId)}&status=eq.new`,
    {
      method: "PATCH",
      headers: serviceRequestHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(patch),
    },
  );
  if (!response.ok) throw new Error("notification_status_update_failed");
}

async function sendOwnerNotification(
  applicationId: string,
  createdAt: string,
  source: string,
  campaign: string | null,
  sourceParamSigned: boolean,
  interest: string,
  name: string,
  message: string,
  telegramUserId: number,
  telegramUsername: string | undefined,
  languageCode: string | undefined,
  clientPlatform: string,
): Promise<void> {
  const safeId = escapeTelegramHtml(applicationId.slice(0, 8).toUpperCase());
  const profileUrl = `tg://user?id=${telegramUserId}`;
  const telegramLabel = telegramUsername ? `@${telegramUsername}` : String(telegramUserId);
  const sourceText = sourceLabel(source) + (campaign ? ` · ${campaign}` : "");
  const notificationMessage = escapeTelegramHtmlTruncated(message, 2200);
  const text = [
    `<b>Заявка №${safeId}</b>`,
    `Источник: ${escapeTelegramHtml(sourceText)}`,
    `Метка источника: ${sourceParamSigned ? "подписана Telegram" : "не подписана Telegram"}`,
    `Интерес: ${escapeTelegramHtml(interestLabel(interest))}`,
    `Имя: ${escapeTelegramHtml(name)}`,
    `Telegram: <a href="${escapeTelegramHtml(profileUrl)}">${escapeTelegramHtml(telegramLabel)}</a>`,
    `Платформа (клиент): ${escapeTelegramHtml(clientPlatform)} · Язык: ${escapeTelegramHtml(languageCode || "не указан")}`,
    `Время: ${escapeTelegramHtml(moscowDate(createdAt))} МСК`,
    "",
    "<b>Сообщение:</b>",
    notificationMessage,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: OWNER_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  let result: { ok?: boolean } | null = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (!response.ok || !result?.ok) throw new Error("telegram_send_failed");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    if (origin && !allowedOrigins.has(origin)) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, origin);
  if (!INTAKE_ENABLED) return jsonResponse({ error: "intake_disabled" }, 503, origin);
  if (origin && !allowedOrigins.has(origin)) return jsonResponse({ error: "origin_not_allowed" }, 403, origin);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "content_type_not_supported" }, 415, origin);
  }

  if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN || !/^-?\d+$/.test(OWNER_CHAT_ID)) {
    return jsonResponse({ error: "server_configuration_error" }, 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof IntakeValidationError && error.code === "request_too_large") {
      return jsonResponse({ error: error.code }, 413, origin);
    }
    return jsonResponse({ error: "invalid_request" }, 400, origin);
  }

  if (!isUuid(body.idempotencyKey) || body.consent !== true) {
    return jsonResponse({ error: "invalid_request" }, 400, origin);
  }
  if (!["partner", "own_product", "question"].includes(String(body.interest))) {
    return jsonResponse({ error: "invalid_interest" }, 400, origin);
  }

  let verified: VerifiedTelegramInitData;
  let name: string;
  let message: string;
  try {
    if (typeof body.initData !== "string") throw new IntakeValidationError("invalid_init_data");
    verified = await validateTelegramInitData(body.initData, BOT_TOKEN);
    name = normalizeText(body.name, 80, "name");
    message = normalizeText(body.message, 1000, "message");
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      const status = error.code === "expired_init_data" ? 401 : 400;
      return jsonResponse({ error: error.code }, status, origin);
    }
    return jsonResponse({ error: "invalid_request" }, 400, origin);
  }

  const resolvedStartParam = resolveIntakeStartParam(verified.startParam, body.startParam);
  const attribution = parseIntakeSource(resolvedStartParam.value);
  const interest = String(body.interest);
  const clientPlatform = normalizeClientPlatform(body.clientPlatform);

  let saved: { application_id: string; created_at: string; duplicate: boolean };
  try {
    saved = await databaseRpc("intake_submit", {
      p_idempotency_key: body.idempotencyKey,
      p_source: attribution.source,
      p_campaign: attribution.campaign,
      p_source_param_signed: resolvedStartParam.signed,
      p_interest: interest,
      p_name: name,
      p_message: message,
      p_telegram_user_id: verified.user.id,
      p_telegram_username: verified.user.username || null,
      p_language_code: verified.user.language_code || null,
      p_client_platform: clientPlatform,
      p_consent_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      return jsonResponse({ error: error.code }, error.code === "rate_limited" ? 429 : 400, origin);
    }
    console.error("Intake persistence failed");
    return jsonResponse({ error: "persistence_failed" }, 500, origin);
  }

  if (saved?.duplicate) {
    return jsonResponse({ ok: true, duplicate: true }, 200, origin);
  }

  try {
    await sendOwnerNotification(
      saved.application_id,
      saved.created_at,
      attribution.source,
      attribution.campaign,
      resolvedStartParam.signed,
      interest,
      name,
      message,
      verified.user.id,
      verified.user.username,
      verified.user.language_code,
      clientPlatform,
    );
    try {
      await updateNotificationStatus(saved.application_id, "notified");
    } catch {
      console.error("Intake notification was sent; status update failed");
    }
  } catch {
    try {
      await updateNotificationStatus(saved.application_id, "notify_failed");
    } catch {
      console.error("Intake notification failed; status update failed");
    }
  }

  return jsonResponse({ ok: true, duplicate: false }, 200, origin);
});
