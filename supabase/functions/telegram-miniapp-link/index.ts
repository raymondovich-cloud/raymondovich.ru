/* Version: 1.0.1 */
/* Updated: 2026-11-24 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

function readKey(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return String(parsed.default || Object.values(parsed)[0] || "");
  } catch {}
  return raw;
}

const PUBLISHABLE_KEY = readKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || readKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
const ALLOWED_ORIGINS = new Set(["https://dev.raymondovich.ru"]);
const encoder = new TextEncoder();

function cors(origin: string) {
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin"
  };
}

function respond(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" }
  });
}

async function hmacSha256(key: Uint8Array, value: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, value));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function validateInitData(raw: string) {
  if (!raw || raw.length > 16384) throw new Error("Telegram initData отсутствует или имеет недопустимый размер.");
  const params = new URLSearchParams(raw);
  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) throw new Error("Подпись Telegram Mini App отсутствует или некорректна.");

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(authDate) || authDate > now + 60 || now - authDate > 86400) {
    throw new Error("Данные Telegram Mini App устарели. Закройте приложение и откройте его снова из бота.");
  }

  const checkString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), encoder.encode(BOT_TOKEN));
  const calculatedHash = toHex(await hmacSha256(secretKey, encoder.encode(checkString)));
  if (!constantTimeEqual(calculatedHash.toLowerCase(), receivedHash.toLowerCase())) {
    throw new Error("Не удалось подтвердить подлинность данных Telegram Mini App.");
  }

  let user: any;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new Error("Telegram не передал корректные данные пользователя.");
  }
  if (!Number.isSafeInteger(user?.id) || user.id <= 0) throw new Error("Telegram ID пользователя отсутствует.");
  return user;
}

async function callRpc(path: string, body: unknown, apiKey: string, authorization = "") {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      ...(authorization ? { Authorization: authorization } : {}),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.msg || payload.error || `Supabase RPC failed (${response.status})`);
  return payload;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors(origin) });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Origin is not allowed" }, 403, origin);
  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SERVICE_KEY || !BOT_TOKEN) {
    return respond({ error: "Server configuration is incomplete" }, 500, origin);
  }

  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!/^Bearer\s+\S+$/i.test(authorization)) return respond({ error: "Требуется авторизация Raymondovich." }, 401, origin);

    const body = await request.json().catch(() => ({}));
    const telegramUser = await validateInitData(String(body?.init_data || ""));

    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: PUBLISHABLE_KEY, Authorization: authorization }
    });
    const authUser = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authUser?.id) return respond({ error: "Сессия Raymondovich недействительна. Войдите в аккаунт повторно." }, 401, origin);

    // Create a short-lived token bound to the currently authenticated Raymondovich account.
    const startResult = await callRpc("rpc/telegram_link_start", {}, PUBLISHABLE_KEY, authorization);
    const startUrl = typeof startResult?.url === "string" ? new URL(startResult.url) : null;
    const startPayload = startUrl?.searchParams.get("start") || "";
    const token = startPayload.startsWith("link_") ? startPayload.slice(5) : "";
    if (startPayload.length !== 64 || !/^[a-f0-9]{59}$/i.test(token)) {
      throw new Error("Не удалось создать корректный одноразовый токен подключения Telegram.");
    }

    await callRpc("rpc/telegram_link_consume", {
      p_token: token,
      p_telegram_user_id: telegramUser.id,
      p_chat_id: telegramUser.id,
      p_username: telegramUser.username || null
    }, SERVICE_KEY, SERVICE_KEY.startsWith("eyJ") ? `Bearer ${SERVICE_KEY}` : "");

    return respond({ ok: true, linked: true, username: telegramUser.username || null }, 200, origin);
  } catch (error) {
    console.error("telegram-miniapp-link error", error instanceof Error ? error.message : "unknown error");
    return respond({ error: error instanceof Error ? error.message : "Не удалось подключить Telegram." }, 400, origin);
  }
});
