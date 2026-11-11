import {
  IntakeValidationError,
  escapeTelegramHtml,
  escapeTelegramHtmlTruncated,
  normalizeText,
} from "../_shared/intake.ts";

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
const NOTICE_VERSION = Deno.env.get("INTAKE_NOTICE_VERSION") ?? "";
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") ?? "";
const TURNSTILE_HOSTNAMES = new Set([
  "raymondovich.ru",
  "www.raymondovich.ru",
  "raymondovich.online",
  "www.raymondovich.online",
  "localhost",
  "127.0.0.1",
]);

const ALLOWED_ORIGINS = new Set([
  "https://raymondovich.ru",
  "https://www.raymondovich.ru",
  "https://raymondovich.online",
  "https://www.raymondovich.online",
]);
const INTERESTS = new Set(["partner", "own_product", "question"]);
const PARTNER_ROLES = new Set(["co_development", "ecosystem_tools", "promotion_only"]);
const AVAILABILITY = new Set(["up_to_5", "5_to_15", "over_15"]);
const PRODUCT_STAGES = new Set(["idea", "in_development", "launched"]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function respond(origin: string, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { apikey: SERVICE_KEY, "Content-Type": "application/json", ...extra };
  if (!SERVICE_KEY.startsWith("sb_secret_")) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  return headers;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeValidationError("invalid_request");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel().catch(() => undefined);
      throw new IntakeValidationError("request_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
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

function optionalText(value: unknown, max: number, code: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new IntakeValidationError(code);
  const normalized = value.normalize("NFKC").trim();
  if ([...normalized].length > max || /[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new IntakeValidationError(code);
  }
  return normalized || null;
}

function optionalHttpsUrl(value: unknown, code: string): string | null {
  const raw = optionalText(value, 2048, code);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error("invalid");
    return url.href;
  } catch {
    throw new IntakeValidationError(code);
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function boundedMeta(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFKC").trim();
  if (!text || [...text].length > max || /[\u0000-\u001F\u007F]/.test(text)) return null;
  return text;
}

function normalizeSource(value: string | null): string {
  if (!value) return "direct";
  const source = value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return source || "direct";
}

function buildTouch(url: URL, referrer: string, timestamp: string): Record<string, unknown> {
  const touch: Record<string, unknown> = {
    source: normalizeSource(url.searchParams.get("utm_source")),
    landing_page: (url.pathname + url.search).slice(0, 512),
    referrer: referrer.slice(0, 512),
    captured_at: timestamp,
  };
  for (const key of UTM_KEYS) touch[key] = boundedMeta(url.searchParams.get(key), 120);
  return touch;
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  if (!response.ok) {
    let message = "";
    try { message = JSON.parse(raw).message || ""; } catch { /* no response body details */ }
    if (message.includes("INTAKE_INVALID_ARGUMENT")) throw new IntakeValidationError("invalid_request");
    throw new Error("database_request_failed");
  }
  return raw ? JSON.parse(raw) : null;
}

async function verifyTurnstile(token: string, idempotencyKey: string): Promise<"valid" | "invalid" | "unavailable"> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        idempotency_key: idempotencyKey,
      }),
    });
    if (!response.ok) return "unavailable";
    const result = await response.json().catch(() => null);
    if (
      result?.success === true &&
      result?.action === "intake_submit" &&
      typeof result?.hostname === "string" &&
      TURNSTILE_HOSTNAMES.has(result.hostname)
    ) return "valid";
    return "invalid";
  } catch {
    return "unavailable";
  }
}

async function notifyOwner(applicationId: string, createdAt: string, body: {
  name: string; message: string; interest: string; source: string;
  partnerRole: string | null; weeklyAvailability: string | null;
  portfolioUrl: string | null; productName: string | null;
  productUrl: string | null; productStage: string | null;
  firstTouch: Record<string, unknown>; lastTouch: Record<string, unknown>;
}): Promise<void> {
  const interestLabels: Record<string, string> = {
    partner: "Хочу стать партнёром",
    own_product: "Есть свой продукт",
    question: "Есть вопрос",
  };
  const roleLabels: Record<string, string> = {
    co_development: "Разработка и запуск совместно с экосистемой",
    ecosystem_tools: "Свой проект с инструментами экосистемы",
    promotion_only: "Продвижение без доступа к инструментам",
  };
  const availabilityLabels: Record<string, string> = {
    up_to_5: "До 5 часов", "5_to_15": "5–15 часов", over_15: "Больше 15 часов",
  };
  const stageLabels: Record<string, string> = {
    idea: "Идея", in_development: "В разработке", launched: "Уже запущен",
  };
  const source = String(body.firstTouch.source || "direct");
  const lines = [
    `<b>Новая заявка с сайта №${escapeTelegramHtml(applicationId.slice(0, 8).toUpperCase())}</b>`,
    `Имя: ${escapeTelegramHtml(body.name)}`,
    `Интерес: ${escapeTelegramHtml(interestLabels[body.interest] || body.interest)}`,
    `Источник: ${escapeTelegramHtml(source)}`,
    `Время: ${escapeTelegramHtml(new Date(createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }))} МСК`,
    ...(body.interest === "partner" ? [
      `Роль: ${escapeTelegramHtml(roleLabels[body.partnerRole || ""] || "Не указана")}`,
      `Занятость: ${escapeTelegramHtml(availabilityLabels[body.weeklyAvailability || ""] || "Не указана")}`,
      ...(body.portfolioUrl ? [`Портфолио: ${escapeTelegramHtml(body.portfolioUrl)}`] : []),
    ] : []),
    ...(body.interest === "own_product" ? [
      ...(body.productName ? [`Продукт: ${escapeTelegramHtml(body.productName)}`] : []),
      ...(body.productUrl ? [`Ссылка: ${escapeTelegramHtml(body.productUrl)}`] : []),
      `Стадия: ${escapeTelegramHtml(stageLabels[body.productStage || ""] || "Не указана")}`,
    ] : []),
    "",
    "<b>Сообщение:</b>",
    escapeTelegramHtmlTruncated(body.message, 2200),
    "",
    `First touch: ${escapeTelegramHtml(JSON.stringify(body.firstTouch).slice(0, 700))}`,
    `Last touch: ${escapeTelegramHtml(JSON.stringify(body.lastTouch).slice(0, 700))}`,
  ];
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error("telegram_delivery_failed");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: cors(origin) });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return respond(origin, 415, { error: "content_type_not_supported" });
  }
  if (!INTAKE_ENABLED) return respond(origin, 503, { error: "intake_disabled" });
  if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN || !/^-?\d+$/.test(OWNER_CHAT_ID) || !NOTICE_VERSION || !TURNSTILE_SECRET) {
    return respond(origin, 503, { error: "server_configuration_error" });
  }

  let input: Record<string, unknown>;
  try {
    input = await readJson(request);
  } catch (error) {
    const code = error instanceof IntakeValidationError ? error.code : "invalid_request";
    return respond(origin, code === "request_too_large" ? 413 : 400, { error: code });
  }

  // Honeypot and minimum completion time reduce unsophisticated automated submissions.
  if (typeof input.companyWebsite === "string" && input.companyWebsite.trim()) {
    return respond(origin, 200, { ok: true });
  }
  if (!isUuid(input.idempotencyKey) || input.consent !== true || input.noticeVersion !== NOTICE_VERSION) {
    return respond(origin, 400, { error: "consent_required" });
  }
  const turnstileToken = boundedMeta(input.turnstileToken, 2048);
  if (!turnstileToken) return respond(origin, 403, { error: "invalid_challenge" });
  const challengeResult = await verifyTurnstile(turnstileToken, input.idempotencyKey);
  if (challengeResult === "unavailable") return respond(origin, 503, { error: "challenge_unavailable" });
  if (challengeResult !== "valid") return respond(origin, 403, { error: "invalid_challenge" });
  const startedAt = Number(input.formStartedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500 || Date.now() - startedAt > 86400000) {
    return respond(origin, 400, { error: "invalid_request" });
  }
  let name: string, message: string, interest: string;
  let partnerRole: string | null = null, weeklyAvailability: string | null = null;
  let portfolioUrl: string | null = null, productName: string | null = null;
  let productUrl: string | null = null, productStage: string | null = null;
  try {
    name = normalizeText(input.name, 80, "name");
    message = normalizeText(input.message, 1000, "message");
    interest = typeof input.interest === "string" ? input.interest : "";
    if (!INTERESTS.has(interest)) throw new IntakeValidationError("invalid_interest");
    if (interest === "partner") {
      partnerRole = typeof input.partnerRole === "string" && PARTNER_ROLES.has(input.partnerRole) ? input.partnerRole : null;
      weeklyAvailability = typeof input.weeklyAvailability === "string" && AVAILABILITY.has(input.weeklyAvailability) ? input.weeklyAvailability : null;
      if (!partnerRole || !weeklyAvailability) throw new IntakeValidationError("invalid_partner_fields");
      portfolioUrl = optionalHttpsUrl(input.portfolioUrl, "invalid_portfolio_url");
    } else if (interest === "own_product") {
      productStage = typeof input.productStage === "string" && PRODUCT_STAGES.has(input.productStage) ? input.productStage : null;
      if (!productStage) throw new IntakeValidationError("invalid_product_stage");
      productName = optionalText(input.productName, 120, "invalid_product_name");
      productUrl = optionalHttpsUrl(input.productUrl, "invalid_product_url");
    }
  } catch (error) {
    const code = error instanceof IntakeValidationError ? error.code : "invalid_request";
    return respond(origin, 400, { error: code });
  }

  const now = new Date().toISOString();
  const requestUrl = new URL(request.url);
  const pageUrl = boundedMeta(input.pageUrl, 512);
  if (pageUrl) {
    try {
      const parsedPage = new URL(pageUrl);
      if (!ALLOWED_ORIGINS.has(parsedPage.origin)) throw new Error("invalid_page");
      requestUrl.search = parsedPage.search;
      requestUrl.pathname = parsedPage.pathname;
    } catch {
      return respond(origin, 400, { error: "invalid_attribution" });
    }
  }
  const firstTouch = input.firstTouch && typeof input.firstTouch === "object" && !Array.isArray(input.firstTouch)
    ? input.firstTouch as Record<string, unknown>
    : buildTouch(requestUrl, boundedMeta(request.headers.get("referer"), 512) || "", now);
  const lastTouch = buildTouch(requestUrl, boundedMeta(request.headers.get("referer"), 512) || "", now);
  const source = normalizeSource(boundedMeta(firstTouch.utm_source, 120) || boundedMeta(firstTouch.source, 32));
  const campaign = boundedMeta(firstTouch.utm_campaign, 120);
  const firstTouchSafe = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source", "landing_page", "referrer", "captured_at"]
      .map((key) => [key, boundedMeta(firstTouch[key], 512)])
  );
  const lastTouchSafe = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source", "landing_page", "referrer", "captured_at"]
      .map((key) => [key, boundedMeta(lastTouch[key], 512)])
  );

  let saved: { application_id: string; created_at: string; duplicate: boolean };
  try {
    saved = await rpc("intake_submit_website", {
      p_idempotency_key: input.idempotencyKey,
      p_source: source,
      p_interest: interest,
      p_name: name,
      p_message: message,
      p_consent_at: now,
      p_consent_notice_version: NOTICE_VERSION,
      p_first_touch: firstTouchSafe,
      p_last_touch: lastTouchSafe,
      p_partner_role: partnerRole,
      p_weekly_availability: weeklyAvailability,
      p_portfolio_url: portfolioUrl,
      p_product_name: productName,
      p_product_url: productUrl,
      p_product_stage: productStage,
    });
  } catch (error) {
    const code = error instanceof IntakeValidationError ? error.code : "persistence_failed";
    console.error("Website intake persistence failed");
    return respond(origin, 500, { error: code });
  }

  if (saved?.duplicate) return respond(origin, 200, { ok: true, duplicate: true });

  let notificationStatus = "pending";
  try {
    await notifyOwner(saved.application_id, saved.created_at, {
      name, message, interest, source, partnerRole, weeklyAvailability,
      portfolioUrl, productName, productUrl, productStage, firstTouch: firstTouchSafe, lastTouch: lastTouchSafe,
    });
    await rpc("intake_set_notification_delivery", {
      p_application_id: saved.application_id,
      p_delivery_status: "sent",
      p_error_code: null,
    });
    notificationStatus = "sent";
  } catch {
    try {
      await rpc("intake_set_notification_delivery", {
        p_application_id: saved.application_id,
        p_delivery_status: "failed",
        p_error_code: "telegram_delivery_failed",
      });
      notificationStatus = "failed";
    } catch {
      console.error("Website intake persisted; notification status update failed");
    }
  }

  return respond(origin, 200, { ok: true, duplicate: false, notificationStatus });
});
