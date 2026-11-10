import {
  IntakeValidationError,
  normalizeText,
  validateTelegramInitData,
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
const ALLOWED_IDS_RAW = Deno.env.get("INTAKE_TEST_ALLOWED_USER_IDS") ?? "";

const ALLOWED_IDS = new Set(
  ALLOWED_IDS_RAW.split(/[,\\s]+/).map((value) => value.trim()).filter((value) => /^\d{1,20}$/.test(value)),
);
const ALLOWED_ORIGINS = new Set([
  "https://raymondovich.ru",
  "https://www.raymondovich.ru",
  "https://raymondovich.online",
  "https://www.raymondovich.online",
]);

function headers(origin: string | null): Record<string, string> {
  const result: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function reply(body: Record<string, unknown>, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function serviceHeaders(): Record<string, string> {
  const result: Record<string, string> = { apikey: SERVICE_KEY, "Content-Type": "application/json" };
  if (!SERVICE_KEY.startsWith("sb_secret_")) result.Authorization = `Bearer ${SERVICE_KEY}`;
  return result;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_request");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 16384) {
      await reader.cancel().catch(() => {});
      throw new Error("request_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_request");
  return parsed as Record<string, unknown>;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function optionalText(value: unknown, maximum: number, code: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new IntakeValidationError(code);
  const normalized = value.normalize("NFKC").trim();
  if ([...normalized].length > maximum || /[\u0000-\u001F\u007F]/.test(normalized)) throw new IntakeValidationError(code);
  return normalized || null;
}

function optionalHttpsUrl(value: unknown, code: string): string | null {
  const raw = optionalText(value, 2048, code);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) throw new Error();
    return parsed.href;
  } catch { throw new IntakeValidationError(code); }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function moscowDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
}

async function rpc(payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/intake_submit`, {
    method: "POST", headers: serviceHeaders(), body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = "";
    try { message = JSON.parse(text).message || ""; } catch { /* no response details in logs */ }
    if (message.includes("INTAKE_RATE_LIMIT")) throw new IntakeValidationError("rate_limited");
    if (message.includes("INTAKE_INVALID_ARGUMENT")) throw new IntakeValidationError("invalid_request");
    throw new Error("database_write_failed");
  }
  return text ? JSON.parse(text) : null;
}

async function updateDelivery(applicationId: string, sent: boolean): Promise<void> {
  const patch = sent
    ? { status: "notified", notified_at: new Date().toISOString(), notify_error: null, notification_status: "sent" }
    : { status: "notify_failed", notify_error: "telegram_send_failed", notification_status: "failed" };
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake_applications?id=eq.${encodeURIComponent(applicationId)}`,
    { method: "PATCH", headers: { ...serviceHeaders(), Prefer: "return=minimal" }, body: JSON.stringify(patch) },
  );
  if (!response.ok) throw new Error("notification_status_update_failed");
}

async function sendNotification(saved: { application_id: string; created_at: string }, userId: number,
  username: string | undefined, name: string, interest: string, message: string): Promise<void> {
  const text = [
    "<b>🧪 ТЕСТОВАЯ ЗАЯВКА INTAKE</b>",
    `ID: <code>${escapeHtml(saved.application_id)}</code>`,
    `Имя: ${escapeHtml(name)}`,
    `Telegram: ${escapeHtml(username ? "@" + username : String(userId))}`,
    `Интерес: ${escapeHtml(interest)}`,
    `Время: ${escapeHtml(moscowDate(saved.created_at))} МСК`,
    "",
    "<b>Сообщение:</b>",
    escapeHtml(message).slice(0, 3000),
    "",
    "<i>Тестовая запись. Не является публичной заявкой.</i>",
  ].join("\n");
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error("telegram_send_failed");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: headers(origin) });
  }
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply({ error: "origin_not_allowed" }, 403, origin);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return reply({ error: "content_type_not_supported" }, 415, origin);
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN || !/^-?\d+$/.test(OWNER_CHAT_ID) || ALLOWED_IDS.size === 0) {
    return reply({ error: "test_mode_not_configured" }, 503, origin);
  }

  let body: Record<string, unknown>;
  try { body = await readBody(request); }
  catch (error) {
    const code = error instanceof Error && error.message === "request_too_large" ? "request_too_large" : "invalid_request";
    return reply({ error: code }, code === "request_too_large" ? 413 : 400, origin);
  }

  let verified;
  let name: string;
  let message: string;
  try {
    if (typeof body.initData !== "string") throw new IntakeValidationError("invalid_init_data");
    verified = await validateTelegramInitData(body.initData, BOT_TOKEN);
    if (!ALLOWED_IDS.has(String(verified.user.id))) return reply({ error: "not_allowlisted" }, 403, origin);
    if (verified.startParam !== "apply-test") return reply({ error: "invalid_test_launch" }, 403, origin);
    if (!isUuid(body.idempotencyKey) || body.consent !== true) throw new IntakeValidationError("invalid_request");
    name = normalizeText(body.name, 80, "name");
    message = normalizeText(body.message, 1000, "message");
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      const status = error.code === "expired_init_data" ? 401 : 400;
      return reply({ error: error.code }, status, origin);
    }
    return reply({ error: "invalid_request" }, 400, origin);
  }

  const interest = String(body.interest || "");
  if (!["partner", "own_product", "question"].includes(interest)) return reply({ error: "invalid_interest" }, 400, origin);

  let details = {
    partnerRole: null as string | null, weeklyAvailability: null as string | null, portfolioUrl: null as string | null,
    productName: null as string | null, productUrl: null as string | null, productStage: null as string | null,
  };
  try {
    if (interest === "partner") {
      if (!["co_development", "ecosystem_tools", "promotion_only"].includes(String(body.partnerRole)) ||
          !["up_to_5", "5_to_15", "over_15"].includes(String(body.weeklyAvailability))) {
        throw new IntakeValidationError("invalid_partner_fields");
      }
      details = {
        ...details, partnerRole: String(body.partnerRole), weeklyAvailability: String(body.weeklyAvailability),
        portfolioUrl: optionalHttpsUrl(body.portfolioUrl, "invalid_portfolio_url"),
      };
    } else if (interest === "own_product") {
      if (!["idea", "in_development", "launched"].includes(String(body.productStage))) {
        throw new IntakeValidationError("invalid_product_stage");
      }
      details = {
        ...details, productName: optionalText(body.productName, 120, "invalid_product_name"),
        productUrl: optionalHttpsUrl(body.productUrl, "invalid_product_url"), productStage: String(body.productStage),
      };
    }
  } catch (error) {
    if (error instanceof IntakeValidationError) return reply({ error: error.code }, 400, origin);
    return reply({ error: "invalid_request" }, 400, origin);
  }

  let saved: { application_id: string; created_at: string; duplicate: boolean };
  try {
    saved = await rpc({
      p_idempotency_key: body.idempotencyKey,
      p_source: "other",
      p_campaign: "test",
      p_source_param_signed: true,
      p_interest: interest,
      p_name: name,
      p_message: message,
      p_telegram_user_id: verified.user.id,
      p_telegram_username: verified.user.username || null,
      p_language_code: verified.user.language_code || null,
      p_client_platform: typeof body.clientPlatform === "string" ? body.clientPlatform.slice(0, 20) : "unknown",
      p_consent_at: new Date().toISOString(),
      p_partner_role: details.partnerRole,
      p_weekly_availability: details.weeklyAvailability,
      p_portfolio_url: details.portfolioUrl,
      p_product_name: details.productName,
      p_product_url: details.productUrl,
      p_product_stage: details.productStage,
    });
  } catch (error) {
    if (error instanceof IntakeValidationError) return reply({ error: error.code }, error.code === "rate_limited" ? 429 : 400, origin);
    console.error("Intake test persistence failed");
    return reply({ error: "persistence_failed" }, 500, origin);
  }

  if (saved?.duplicate) return reply({ ok: true, duplicate: true, notification: "not_repeated" }, 200, origin);

  let notification = "sent";
  try {
    await sendNotification(saved, verified.user.id, verified.user.username, name, interest, message);
    await updateDelivery(saved.application_id, true);
  } catch {
    notification = "failed";
    try { await updateDelivery(saved.application_id, false); }
    catch { console.error("Intake test notification status update failed"); }
    console.error("Intake test notification delivery failed");
  }

  return reply({ ok: true, duplicate: false, notification, applicationId: saved.application_id }, 200, origin);
});
