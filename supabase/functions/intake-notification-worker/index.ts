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
const WORKER_SECRET = Deno.env.get("INTAKE_WORKER_SECRET") ?? "";

type ClaimedItem = { application_id: string };
type Application = {
  id: string;
  created_at: string;
  source: string;
  interest: string;
  name: string;
  message: string;
  partner_role: string | null;
  weekly_availability: string | null;
  portfolio_url: string | null;
  product_name: string | null;
  product_url: string | null;
  product_stage: string | null;
  first_touch: Record<string, unknown> | null;
  last_touch: Record<string, unknown> | null;
};

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  if (!SERVICE_KEY.startsWith("sb_secret_")) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  return headers;
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function truncate(value: unknown, maximum: number): string {
  const text = String(value ?? "");
  return [...text].length > maximum ? [...text].slice(0, maximum).join("") + "…" : text;
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

function touchSummary(value: Record<string, unknown> | null): string {
  if (!value) return "не указано";
  const fields = ["source", "utm_source", "utm_medium", "utm_campaign", "landing_page"];
  const parts = fields
    .map((key) => [key, value[key]])
    .filter(([, item]) => typeof item === "string" && item.length > 0)
    .map(([key, item]) => `${key}: ${truncate(item, 120)}`);
  return parts.length ? parts.join(" · ") : "не указано";
}

function buildMessage(application: Application): string {
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
    up_to_5: "До 5 часов",
    "5_to_15": "5–15 часов",
    over_15: "Больше 15 часов",
  };
  const stageLabels: Record<string, string> = {
    idea: "Идея",
    in_development: "В разработке",
    launched: "Уже запущен",
  };
  const lines = [
    `<b>Новая заявка с сайта №${escapeHtml(application.id.slice(0, 8).toUpperCase())}</b>`,
    `Имя: ${escapeHtml(application.name)}`,
    `Интерес: ${escapeHtml(interestLabels[application.interest] ?? application.interest)}`,
    `Источник: ${escapeHtml(application.source || "direct")}`,
    `Время: ${escapeHtml(moscowDate(application.created_at))} МСК`,
    ...(application.interest === "partner" ? [
      `Роль: ${escapeHtml(roleLabels[application.partner_role ?? ""] ?? "Не указана")}`,
      `Занятость: ${escapeHtml(availabilityLabels[application.weekly_availability ?? ""] ?? "Не указана")}`,
      ...(application.portfolio_url ? [`Портфолио: ${escapeHtml(application.portfolio_url)}`] : []),
    ] : []),
    ...(application.interest === "own_product" ? [
      ...(application.product_name ? [`Продукт: ${escapeHtml(application.product_name)}`] : []),
      ...(application.product_url ? [`Ссылка: ${escapeHtml(application.product_url)}`] : []),
      `Стадия: ${escapeHtml(stageLabels[application.product_stage ?? ""] ?? "Не указана")}`,
    ] : []),
    "",
    "<b>Сообщение:</b>",
    escapeHtml(truncate(application.message, 2200)),
    "",
    `First touch: ${escapeHtml(truncate(touchSummary(application.first_touch), 500))}`,
    `Last touch: ${escapeHtml(truncate(touchSummary(application.last_touch), 500))}`,
  ];
  return lines.join("\n");
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("database_rpc_failed");
  return raw ? JSON.parse(raw) : null;
}

async function loadApplication(applicationId: string): Promise<Application> {
  const query = new URLSearchParams({
    select: "id,created_at,source,interest,name,message,partner_role,weekly_availability,portfolio_url,product_name,product_url,product_stage,first_touch,last_touch",
    id: `eq.${applicationId}`,
    limit: "1",
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/intake_applications?${query}`, {
    headers: serviceHeaders(),
  });
  if (!response.ok) throw new Error("application_read_failed");
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("application_not_found");
  return rows[0] as Application;
}

async function sendTelegram(application: Application): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: OWNER_CHAT_ID,
      text: buildMessage(application),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) {
    throw new Error(response.status === 429 ? "telegram_rate_limited" : "telegram_delivery_failed");
  }
}

async function markDelivery(applicationId: string, status: "sent" | "failed", errorCode: string | null): Promise<void> {
  await rpc("intake_set_notification_delivery", {
    p_application_id: applicationId,
    p_delivery_status: status,
    p_error_code: errorCode,
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!WORKER_SECRET || !safeEqual(request.headers.get("x-intake-worker-secret") ?? "", WORKER_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN || !/^-?\d+$/.test(OWNER_CHAT_ID)) {
    return new Response("Worker configuration error", { status: 503 });
  }

  try {
    const claimed = await rpc("intake_claim_notification_batch", {
      p_batch_size: 10,
      p_lock_seconds: 90,
    });
    const items: ClaimedItem[] = Array.isArray(claimed) ? claimed : claimed?.items ?? [];
    let sent = 0;
    let failed = 0;

    for (const item of items) {
      if (!item || typeof item.application_id !== "string") continue;
      try {
        const application = await loadApplication(item.application_id);
        await sendTelegram(application);
        await markDelivery(item.application_id, "sent", null);
        sent += 1;
      } catch (error) {
        const code = error instanceof Error && error.message === "telegram_rate_limited"
          ? "telegram_rate_limited"
          : error instanceof Error && error.message === "application_not_found"
          ? "application_not_found"
          : "telegram_delivery_failed";
        try {
          await markDelivery(item.application_id, "failed", code);
        } catch {
          // The claim lock expires automatically; the next worker can recover the item.
          console.error("Intake notification state update failed");
        }
        failed += 1;
      }
    }

    return Response.json({ ok: true, claimed: items.length, sent, failed });
  } catch {
    console.error("Intake notification worker batch failed");
    return new Response("Worker batch failed", { status: 503 });
  }
});
