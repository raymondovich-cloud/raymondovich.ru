import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const DB = `${SUPABASE_URL}/rest/v1`;

async function rpc(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${DB}/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${name} failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function sendTelegram(chatId: number, message: string) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram API error (${response.status})`);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN) return Response.json({ error: "Worker configuration is incomplete" }, { status: 500 });
  try {
    const authorized = await rpc("notifications_worker_authorize", { p_token: request.headers.get("x-worker-token") || "" });
    if (authorized !== true) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const batch = await rpc("notifications_telegram_claim", { p_limit: 25 });
    const items = Array.isArray(batch) ? batch : [];
    let sent = 0, failed = 0;
    for (const item of items) {
      const deadlineText = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(item.deletion_at));
      const objectLabel = item.object_type === "project" ? "Проект" : "Команда";
      const remaining = item.milestone === "5_days" ? "через 5 дней" : item.milestone === "1_day" ? "через 1 день" : "через 1 час";
      const message = [
        "Raymondovich · уведомление", "",
        `${objectLabel} «${item.object_name}» будет автоматически удалён ${remaining}.`,
        `Планируемое время удаления: ${deadlineText} (МСК).`, "",
        "Чтобы сохранить объект, восстановите его в Корзине до указанного срока."
      ].join("\n");
      try {
        await sendTelegram(Number(item.chat_id), message);
        await rpc("notifications_telegram_complete", { p_reminder_id: item.reminder_id, p_success: true, p_error: null });
        sent++;
      } catch (error) {
        const messageText = String(error instanceof Error ? error.message : error);
        if (/blocked|chat not found|user is deactivated/i.test(messageText)) {
          await fetch(`${DB}/telegram_bot_users?chat_id=eq.${encodeURIComponent(String(item.chat_id))}`, {
            method: "PATCH",
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ is_blocked: true, updated_at: new Date().toISOString() })
          });
        }
        await rpc("notifications_telegram_complete", { p_reminder_id: item.reminder_id, p_success: false, p_error: messageText });
        failed++;
      }
    }
    return Response.json({ ok: true, claimed: items.length, sent, failed });
  } catch (error) {
    console.error("workspace-deletion-notifications worker failed", error);
    return Response.json({ error: "Worker execution failed" }, { status: 500 });
  }
});
