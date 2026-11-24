/* Version: 34.2.0 */
/* Updated: 2026-11-24 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DB = `${SUPABASE_URL}/rest/v1`;
const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${DB}/${path}`, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`DB ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}
async function recordOwnerMessage(chatId: number, messageId: number, date: number, direction: "incoming" | "outgoing") {
  if (chatId !== 1969734974 || !messageId) return;
  await db("telegram_owner_chat_messages?on_conflict=chat_id,message_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, message_date: new Date((date || Math.floor(Date.now()/1000))*1000).toISOString(), direction })
  });
}
async function tg(method: string, payload: any) {
  const r = await fetch(`${API}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await r.json();
  if (!j.ok) throw Object.assign(new Error(j.description || "Telegram API error"), { telegram: j });
  if (method.startsWith("send") && j.result?.message_id && Number(payload?.chat_id) === 1969734974) {
    try { await recordOwnerMessage(1969734974, j.result.message_id, j.result.date, "outgoing"); }
    catch (e) { console.error("Could not record owner outgoing message", e); }
  }
  return j.result;
}
const keyboard = (rows: any[][]) => ({ inline_keyboard: rows });
async function say(chat_id: number, text: string, reply_markup?: unknown, parse_mode?: string) {
  return tg("sendMessage", { chat_id, text, reply_markup, disable_web_page_preview: true, ...(parse_mode ? { parse_mode } : {}) });
}
async function answer(id: string, text = "") { try { await tg("answerCallbackQuery", { callback_query_id: id, text }); } catch {} }
async function session(uid: number) {
  const rows = await db(`telegram_admin_sessions?telegram_user_id=eq.${uid}&select=*`);
  return rows?.[0] ?? { state: "idle", data: {} };
}
async function saveSession(uid: number, state: string, data: any = {}) {
  await db("telegram_admin_sessions?on_conflict=telegram_user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ telegram_user_id: uid, state, data, updated_at: new Date().toISOString(), expires_at: new Date(Date.now()+86400000).toISOString() }) });
}
async function isAdmin(uid: number) {
  const rows = await db(`telegram_admins?telegram_user_id=eq.${uid}&select=role`);
  return rows?.[0]?.role ?? null;
}
const BASIC_COMMANDS = [
  { command: "subscription", description: "Управление подпиской на рассылку" },
  { command: "integration", description: "Подключить Telegram к Raymondovich" },
  { command: "help", description: "Справка и поддержка" },
];
const HELP_COMMAND = { command: "help", description: "Справка и поддержка" };
const HELP_TEXT = [
  "<b>Справка и поддержка</b>",
  "",
  "<b>КОМАНДЫ БОТА</b>",
  "",
  "/subscription — управление подпиской на рассылку. Вы можете включить или отключить получение публикаций в любое время. Отключение рассылки не удаляет вас из бота.",
  "",
  "/integration — завершить подключение Telegram к аккаунту Raymondovich.",
  "",
  "/help — открыть справку и информацию о поддержке.",
  "",
  "<b>НАШИ РЕСУРСЫ</b>",
  "",
  "Посмотреть наши ресурсы, узнать о проектах и следить за обновлениями вы можете в закреплённом сообщении бота.",
  "",
  "<b>ПАРТНЁРСТВО</b>",
  "",
  "Хотите стать частью Raymondovich и участвовать в развитии цифровых проектов?",
  "",
  "Мы открыты к сотрудничеству с партнёрами, разработчиками и владельцами собственных продуктов.",
  "",
  'Информация о форматах сотрудничества и условиях участия доступна на нашем сайте: <a href="https://raymondovich.ru">raymondovich.ru</a>',
  "",
  "<b>ОСТАЛИСЬ ВОПРОСЫ ИЛИ НУЖНА ПОМОЩЬ?</b>",
  "",
  "Если у вас возник вопрос или проблема с работой бота, напишите нам:",
  "",
  '<a href="https://t.me/raymondovich_support">Написать в службу поддержки</a>'
].join("\n");
async function syncCommands(uid: number, role: string | null, isSubscribed = true) {
  const subscriptionCommand = isSubscribed
    ? { command: "subscription", description: "Отключить рассылку" }
    : { command: "subscription", description: "Включить рассылку" };
  const commands = [
    subscriptionCommand,
    { command: "integration", description: "Подключить Telegram к Raymondovich" },
    HELP_COMMAND,
    ...(role === "owner" ? [
      { command: "admin", description: "Меню администрирования" },
    ] : role === "publications_admin" ? [
      { command: "publish", description: "Управление публикациями" },
    ] : []),
  ];
  return tg("setMyCommands", {
    scope: { type: "chat", chat_id: uid },
    commands,
  });
}
async function getSetting(key: string) {
  const rows = await db(`telegram_bot_settings?setting_key=eq.${encodeURIComponent(key)}&select=setting_value`);
  return rows?.[0]?.setting_value ?? null;
}
async function setSetting(key: string, value: unknown, uid: number) {
  await db("telegram_bot_settings?on_conflict=setting_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ setting_key: key, setting_value: value, updated_by: uid, updated_at: new Date().toISOString() }) });
}
async function adminMenu(chat: number, role: string) {
  if (role !== "owner") return publicationsMenu(chat, role);
  const rows: any[][] = [
    [{ text: "📝 Управление публикациями", callback_data: "admin:publications" }],
    [{ text: "👥 Администраторы", callback_data: "admin:admins" }],
    [{ text: "📱 Отчёт по Telegram Mini App", callback_data: "admin:miniapp" }],
    [{ text: "🌐 Отчёт по Web Version", callback_data: "admin:web" }],
    [{ text: "💰 Монетизация", callback_data: "admin:monetization" }],
    [{ text: "📊 Общий отчёт о пользователях", callback_data: "admin:users" }],
    [{ text: "⚠️ Отчёт об ошибках", callback_data: "admin:errors" }],
    [{ text: "🧹 Очистить переписку", callback_data: "admin:clear" }],
  ];
  await say(chat, "Панель управления экосистемой", keyboard(rows));
}
async function publicationsMenu(chat: number, role: string) {
  const rows: any[][] = [
    [{ text: "✏️ Новая публикация", callback_data: "new" }],
    [{ text: "📚 История публикаций", callback_data: "history" }],
  ];
  if (role === "owner") rows.push([{ text: "⚙️ Настройки приватной группы", callback_data: "group" }]);
  if (role === "owner") rows.push([{ text: "↩ В главное меню", callback_data: "admin:home" }]);
  await say(chat, "Управление публикациями", keyboard(rows));
}
async function adminPlaceholder(chat: number, title: string, description: string) {
  await say(chat, title + "\\n\\n" + description, keyboard([[{ text: "↩ В главное меню", callback_data: "admin:home" }]]));
}
async function draftMenu(chat: number, d: any) {
  const targets = d.targets || [];
  const buttons = d.buttons || [];
  const mark = (k: string, label: string) => ({ text: `${targets.includes(k) ? "☑" : "☐"} ${label}`, callback_data: `target:${k}` });
  const rows: any[][] = [
    [{ text: "✏️ Изменить текст", callback_data: "edittext" }, { text: "📎 Добавить вложение", callback_data: "attach" }],
    [{ text: `🔘 Кнопки публикации (${buttons.length})`, callback_data: "buttons" }],
    [{ text: "🧹 Удалить вложения", callback_data: "clearmedia" }],
    [mark("users", "Пользователи"), mark("channel", "Канал")],
    [mark("group", "Приватная группа")],
    [{ text: "👁 Предпросмотр", callback_data: "preview" }],
    [{ text: "↩ В меню", callback_data: "adminmenu" }, { text: "Отменить", callback_data: "cancel" }]
  ];
  await say(chat, "Черновик публикации\n\n" + (d.body || "Текст не добавлен") + `\n\nВложений: ${(d.media || []).length}\nКнопок: ${buttons.length}\nПолучатели: ${targets.length ? targets.join(", ") : "не выбраны"}`, keyboard(rows));
}
async function buttonsMenu(chat: number, d: any) {
  const buttons = d.buttons || [];
  const rows: any[][] = [[{ text: "➕ Добавить кнопку", callback_data: "button:add" }]];
  buttons.forEach((b: any, i: number) => rows.push([{ text: `❌ ${b.text}`, callback_data: `button:remove:${i}` }]));
  if (buttons.length) rows.push([{ text: "🧹 Удалить все кнопки", callback_data: "button:clear" }]);
  rows.push([{ text: "↩ К черновику", callback_data: "backdraft" }]);
  await say(chat, buttons.length
    ? "Кнопки под публикацией (нажмите на кнопку, чтобы удалить её):\n" + buttons.map((b: any, i: number) => `${i + 1}. ${b.text} → ${b.url}`).join("\n")
    : "Кнопки пока не добавлены. Можно добавить до 8 URL-кнопок.", keyboard(rows));
}
async function rememberUser(msg: any) {
  const u = msg.from; if (!u?.id || !msg.chat?.id || msg.chat.type !== "private") return;
  await db("telegram_bot_users?on_conflict=chat_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ telegram_user_id: u.id, chat_id: msg.chat.id, username: u.username ?? null, first_name: u.first_name ?? null, last_name: u.last_name ?? null, last_interaction_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
}
async function startPublication(chat: number, uid: number) {
  await saveSession(uid, "draft", { body: "", media: [], targets: [] });
  await say(chat, "Создаём публикацию. Отправьте текст следующим сообщением. Фото, видео и документы можно добавить через кнопку «Добавить вложение».");
}
async function createAndSend(uid: number, chat: number, d: any) {
  if (!d.body?.trim() && !(d.media || []).length) return say(chat, "Добавьте текст или вложение перед публикацией.");
  if (!(d.targets || []).length) return say(chat, "Выберите хотя бы одно направление.");
  if (d.targets.includes("group") && !(await getSetting("private_group_chat_id"))?.chat_id) return say(chat, "Сначала настройте chat ID приватной группы в меню настроек.");
  const rows = await db("telegram_publications?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ created_by: uid, body: d.body || "", media: d.media || [], buttons: d.buttons || [], targets: d.targets, status: "sending" }) });
  const id = rows[0].id, recipients: any[] = [];
  if (d.targets.includes("channel")) recipients.push({ target_type: "channel", recipient_chat_id: "@raymondovich_public" });
  if (d.targets.includes("group")) recipients.push({ target_type: "group", recipient_chat_id: String((await getSetting("private_group_chat_id")).chat_id) });
  if (d.targets.includes("users")) {
    const users = await db("telegram_bot_users?is_blocked=eq.false&is_subscribed=eq.true&select=chat_id");
    for (const u of users || []) recipients.push({ target_type: "user", recipient_chat_id: String(u.chat_id) });
  }
  const unique = [...new Map(recipients.map(x => [`${x.target_type}:${x.recipient_chat_id}`, x])).values()];
  if (!unique.length) { await db(`telegram_publications?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "failed" }) }); return say(chat, "Нет доступных получателей."); }
  for (const r of unique) await db("telegram_publication_deliveries", { method: "POST", body: JSON.stringify({ publication_id: id, ...r, status: "pending" }) });
  await saveSession(uid, "idle", {});
  await say(chat, `Публикация #${id.slice(0,8)} подтверждена. Начинаю отправку в ${unique.length} адресов. Отчёт придёт после завершения.`);
  const task = processBatch(id, uid, chat);
  const rt = (globalThis as any).EdgeRuntime; if (rt?.waitUntil) rt.waitUntil(task); else await task;
}
function publicationMarkup(pub: any) {
  const buttons = Array.isArray(pub.buttons) ? pub.buttons : [];
  if (!buttons.length) return undefined;
  return keyboard(buttons.map((b: any) => [{ text: b.text, url: b.url }]));
}
function escapeHtmlText(value: string) {
  return value.replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Preserve explicitly supplied HTTP(S) anchors while escaping other HTML markup.
function publicationHtml(value: string) {
  const anchors: string[] = [];
  const protectedText = value.replace(/<a\s+href=(["'«“])(https?:\/\/[^"'«»“”<> \t\r\n]+)["'»”]\s*>([\s\S]*?)<\/a\s*>/gi, (_match, _quote, href, label) => {
    let safeHref = "";
    try {
      const parsed = new URL(href);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported URL protocol");
      safeHref = parsed.href;
    } catch {
      return escapeHtmlText(label);
    }
    const anchor = '<a href="' + escapeHtmlText(safeHref).replace(/"/g, "&quot;") + '">' + escapeHtmlText(label) + "</a>";
    const token = "RAYMONDOVICHANCHOR" + anchors.length + "TOKEN";
    anchors.push(anchor);
    return token;
  });
  return escapeHtmlText(protectedText).replace(/RAYMONDOVICHANCHOR(\d+)TOKEN/g, (_m, index) => anchors[Number(index)] ?? "");
}
async function sendOne(chat: string, pub: any) {
  const media = pub.media || [];
  const reply_markup = publicationMarkup(pub);
  if (!media.length) {
    if (pub.body) await tg("sendMessage", { chat_id: chat, text: publicationHtml(pub.body), parse_mode: "HTML", disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });
    return;
  }
  const longText = (pub.body || "").length > 1024;
  for (let i=0; i<media.length; i++) {
    const m = media[i], caption = i === 0 && !longText ? (pub.body || "") : (m.caption || "");
    const method = m.type === "photo" ? "sendPhoto" : m.type === "video" ? "sendVideo" : "sendDocument";
    const field = m.type === "photo" ? "photo" : m.type === "video" ? "video" : "document";
    const attachMarkup = reply_markup && !longText && i === media.length - 1 ? { reply_markup } : {};
    await tg(method, { chat_id: chat, [field]: m.file_id, ...(caption ? { caption: publicationHtml(caption), parse_mode: "HTML" } : {}), ...attachMarkup });
  }
  if (longText) await tg("sendMessage", { chat_id: chat, text: publicationHtml(pub.body), parse_mode: "HTML", disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });
}
async function processBatch(id: string, uid: number, reportChat: number) {
  const pubs = await db(`telegram_publications?id=eq.${id}&select=*`), pub = pubs[0]; if (!pub) return;
  const pending = await db(`telegram_publication_deliveries?publication_id=eq.${id}&status=eq.pending&select=*&limit=20`);
  for (const row of pending) {
    if (row.target_type === "user") {
      const subscription = await db(`telegram_bot_users?chat_id=eq.${row.recipient_chat_id}&select=is_subscribed`);
      if (!subscription?.[0]?.is_subscribed) {
        await db(`telegram_publication_deliveries?id=eq.${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "skipped", error_message: "User unsubscribed before delivery", attempts: row.attempts + 1 })
        });
        continue;
      }
    }
    try {
      await sendOne(String(row.recipient_chat_id), pub);
      await db(`telegram_publication_deliveries?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 }) });
    } catch (e: any) {
      const desc = String(e?.message || e), blocked = /403|bot was blocked|chat not found|bot can't initiate/i.test(desc);
      if (row.target_type === "user" && blocked) await db(`telegram_bot_users?chat_id=eq.${row.recipient_chat_id}`, { method: "PATCH", body: JSON.stringify({ is_blocked: true, updated_at: new Date().toISOString() }) });
      await db(`telegram_publication_deliveries?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", error_message: desc.slice(0,500), attempts: row.attempts + 1 }) });
      const retry = e?.telegram?.parameters?.retry_after; if (retry) await new Promise(r => setTimeout(r, Math.min(retry, 10)*1000));
    }
    await new Promise(r => setTimeout(r, 45));
  }
  const left = await db(`telegram_publication_deliveries?publication_id=eq.${id}&status=eq.pending&select=id&limit=1`);
  if (left.length) { await processBatch(id, uid, reportChat); return; }
  const stats = await db(`telegram_publication_deliveries?publication_id=eq.${id}&select=target_type,status`);
  const sent = stats.filter((x:any)=>x.status==="sent").length, failed = stats.filter((x:any)=>x.status==="failed").length, skipped = stats.filter((x:any)=>x.status==="skipped").length;
  const by: any = {};
  for (const s of stats) { by[s.target_type] ||= {sent:0,failed:0,skipped:0}; by[s.target_type][s.status] = (by[s.target_type][s.status]||0)+1; }
  const status = failed === 0 ? "completed" : sent > 0 ? "partial" : "failed";
  await db(`telegram_publications?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, published_at: new Date().toISOString() }) });
  const lines = Object.entries(by).map(([k,v]:any)=>`${k}: отправлено ${v.sent||0}, ошибок ${v.failed||0}, пропущено ${v.skipped||0}`);
  await say(reportChat, `Отчёт по публикации #${id.slice(0,8)}\nСтатус: ${status}\nВсего: успешно ${sent}, ошибок ${failed}, пропущено ${skipped}\n\n${lines.join("\n")}`);
}
async function clearOwnerChat(chat: number) {
  if (chat !== 1969734974) return say(chat, "Нет доступа.");
  const rows = await db("telegram_owner_chat_messages?chat_id=eq.1969734974&select=message_id,message_date&order=message_id.asc&limit=500");
  let deleted = 0, tooOld = 0, failed = 0;
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (const row of rows || []) {
    if (new Date(row.message_date).getTime() < cutoff) { tooOld++; continue; }
    try {
      await tg("deleteMessage", { chat_id: 1969734974, message_id: row.message_id });
      deleted++;
    } catch (e: any) {
      const desc = String(e?.message || e);
      if (/message to delete not found|message can't be deleted|message can't be deleted for everyone|message_id_invalid/i.test(desc)) failed++;
      else { failed++; console.error("Owner chat cleanup failed for message", row.message_id, desc); }
    }
    await new Promise(r => setTimeout(r, 40));
  }
  await db("telegram_owner_chat_messages?chat_id=eq.1969734974", { method: "DELETE" });
  return say(chat, `Очистка завершена. Удалено: ${deleted}. Старше 48 часов: ${tooOld}. Не удалось удалить: ${failed}. Новые сообщения будут учитываться автоматически.`);
}
async function handleCallback(q: any, role: string | null) {
  const uid=q.from.id, chat=q.message.chat.id, data=q.data||""; await answer(q.id);
  if (!role) return say(chat, "Нет доступа.");
  if (data === "admin:clear") {
    if (role !== "owner" || uid !== 1969734974) return say(chat, "Нет доступа.");
    return say(chat, "Очистить историю личной переписки с ботом? Будут удалены только доступные для удаления сообщения в твоём чате. Это действие нельзя отменить.", keyboard([[{text:"✅ Подтвердить очистку",callback_data:"admin:clear:confirm"}],[{text:"Отмена",callback_data:"admin:home"}]]));
  }
  if (data === "admin:clear:confirm") {
    if (role !== "owner" || uid !== 1969734974) return say(chat, "Нет доступа.");
    return clearOwnerChat(chat);
  }
  if (data === "admin:home") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminMenu(chat, role);
  }
  if (data === "admin:publications") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return publicationsMenu(chat, role);
  }
  if (data === "admin:miniapp") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminPlaceholder(chat, "📱 Отчёт по Telegram Mini App", "Сбор статистики ещё не подключён. В будущем добавим активных пользователей, сессии и время использования Mini App.");
  }
  if (data === "admin:web") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminPlaceholder(chat, "🌐 Отчёт по Web Version", "Веб-аналитика ещё не подключена. Здесь появятся посещаемость, уникальные посетители и активность сайта.");
  }
  if (data === "admin:monetization") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminPlaceholder(chat, "💰 Монетизация", "Учёт платежей и уведомления об оплате приватной группы будут подключены отдельным этапом.");
  }
  if (data === "admin:users") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminPlaceholder(chat, "📊 Общий отчёт о пользователях", "Сводная статистика сайта, бота, общей и приватной групп пока не подключена.");
  }
  if (data === "admin:errors") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    return adminPlaceholder(chat, "⚠️ Отчёт об ошибках", "Централизованный сбор ошибок сайта и Mini App ещё не подключён. Сейчас доступны только технические записи обработки обновлений Telegram.");
  }
  if (data === "admin:admins") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    const admins = await db("telegram_admins?select=telegram_user_id,role,created_at&order=created_at.asc");
    const lines = (admins || []).map((a:any) => `${a.role === "owner" ? "Владелец" : "Администратор публикаций"} · ID ${a.telegram_user_id}`);
    const rows:any[][] = [[{text:"➕ Добавить администратора",callback_data:"admin:add"}]];
    for (const a of admins || []) {
      if (a.role !== "owner") rows.push([{text:`❌ Удалить ID ${a.telegram_user_id}`,callback_data:`admin:remove:${a.telegram_user_id}`}]);
    }
    rows.push([{text:"↩ В главное меню",callback_data:"admin:home"}]);
    return say(chat, "Действующие администраторы:\\n\\n" + (lines.length ? lines.join("\n") : "Список пуст."), keyboard(rows));
  }
  if (data === "admin:add") {
    if (role !== "owner") return say(chat, "Нет доступа.");
    await saveSession(uid, "admin_add", {});
    return say(chat, "Отправьте Telegram ID нового администратора публикаций. Пользователь должен предварительно запустить бота командой /start.");
  }
  if (data.startsWith("admin:remove:")) {
    if (role !== "owner") return say(chat, "Нет доступа.");
    const target = Number(data.split(":")[2]);
    if (!Number.isSafeInteger(target) || target <= 0 || target === uid) return say(chat, "Некорректный ID администратора.");
    const targetRows = await db(`telegram_admins?telegram_user_id=eq.${target}&select=role`);
    if (!targetRows?.length || targetRows[0].role === "owner") return say(chat, "Такой администратор не найден или его нельзя удалить.");
    await db(`telegram_admins?telegram_user_id=eq.${target}`, {method:"DELETE"});
    try { await syncCommands(target, null); } catch (e) { console.error("Could not reset Telegram commands for removed admin", e); }
    const admins = await db("telegram_admins?select=telegram_user_id,role,created_at&order=created_at.asc");
    const lines = (admins || []).map((a:any) => `${a.role === "owner" ? "Владелец" : "Администратор публикаций"} · ID ${a.telegram_user_id}`);
    const rows:any[][] = [[{text:"➕ Добавить администратора",callback_data:"admin:add"}]];
    for (const a of admins || []) if (a.role !== "owner") rows.push([{text:`❌ Удалить ID ${a.telegram_user_id}`,callback_data:`admin:remove:${a.telegram_user_id}`}]);
    rows.push([{text:"↩ В главное меню",callback_data:"admin:home"}]);
    return say(chat, "Администратор удалён.\\n\\nДействующие администраторы:\\n" + (lines.length ? lines.join("\n") : "Список пуст."), keyboard(rows));
  }
  const s=await session(uid), d=s.data||{};
  if (data==="adminmenu") return publicationsMenu(chat,role);
  if (data==="new") return startPublication(chat,uid);
  if (data==="buttons" && s.state==="draft") return buttonsMenu(chat,d);
  if (data==="button:add" && s.state==="draft") {
    if ((d.buttons || []).length >= 8) return say(chat, "Достигнут лимит: не более 8 кнопок в одной публикации.");
    await saveSession(uid, "button_add", d);
    return say(chat, "Отправьте данные новой кнопки двумя строками:\n1. Текст кнопки\n2. Полная ссылка, начинающаяся с https:// или http://\n\nНапример:\n🚀 Открыть Raymondovich\nhttps://t.me/raymondovich_bot?startapp\n\nДля отмены используйте /cancel.");
  }
  if (data.startsWith("button:remove:") && s.state==="draft") {
    const index = Number(data.split(":")[2]);
    if (!Number.isInteger(index) || index < 0 || index >= (d.buttons || []).length) return buttonsMenu(chat,d);
    d.buttons.splice(index,1);
    await saveSession(uid,"draft",d);
    return buttonsMenu(chat,d);
  }
  if (data==="button:clear" && s.state==="draft") {
    d.buttons=[];
    await saveSession(uid,"draft",d);
    return buttonsMenu(chat,d);
  }
  if (data==="cancel") { await saveSession(uid,"idle",{}); return say(chat,"Черновик отменён."); }
  if (data==="history") {
    const rows=await db("telegram_publications?select=id,status,created_at,targets&order=created_at.desc&limit=10");
    return say(chat,rows.length?rows.map((x:any)=>`#${x.id.slice(0,8)} · ${x.status} · ${new Date(x.created_at).toLocaleString("ru-RU")} · ${(x.targets||[]).join(",")}`).join("\n"):"История пока пуста.");
  }
  if (data==="admins" && role==="owner") { await saveSession(uid,"admin_add",{}); return say(chat,"Отправьте Telegram ID, чтобы добавить администратора публикаций. Для удаления: /deladmin ID."); }
  if (data==="group" && role==="owner") { await saveSession(uid,"group_id",{}); return say(chat,"Отправьте chat ID приватной группы (обычно начинается с -100)."); }
  if (data.startsWith("target:") && s.state==="draft") { const t=data.split(":")[1]; d.targets=d.targets||[]; d.targets=d.targets.includes(t)?d.targets.filter((x:string)=>x!==t):[...d.targets,t]; await saveSession(uid,"draft",d); return draftMenu(chat,d); }
  if (data==="edittext" && s.state==="draft") { await saveSession(uid,"edit_text",d); return say(chat,"Отправьте новый текст публикации одним сообщением."); }
  if (data==="attach" && s.state==="draft") { await saveSession(uid,"attach",d); return say(chat,"Отправьте фото, видео или документ.",keyboard([[{text:"Вернуться к черновику",callback_data:"backdraft"}]])); }
  if (data==="backdraft") { await saveSession(uid,"draft",d); return draftMenu(chat,d); }
  if (data==="clearmedia" && s.state==="draft") { d.media=[]; await saveSession(uid,"draft",d); return draftMenu(chat,d); }
  if (data==="preview" && s.state==="draft") {
    const g=d.targets?.includes("group")?await getSetting("private_group_chat_id"):null;
    const info=[d.targets?.includes("users")?"Пользователи":null,d.targets?.includes("channel")?"@raymondovich_public":null,d.targets?.includes("group")?(g?.chat_id?"Приватная группа настроена":"Приватная группа НЕ настроена"):null].filter(Boolean).join(", ");
    const buttonPreview = (d.buttons || []).map((b: any, i: number) => `${i+1}. ${b.text} → ${b.url}`).join("\n") || "нет";
    return say(chat,`ПРЕДПРОСМОТР\n\n${publicationHtml(d.body||"[без текста]")}\n\nВложений: ${(d.media||[]).length}\nКнопок: ${buttonPreview}\nНаправления: ${info||"не выбраны"}`,keyboard([[{text:"✅ Опубликовать",callback_data:"publish_confirm"},{text:"↩ К черновику",callback_data:"backdraft"}],[{text:"Отменить",callback_data:"cancel"}]]),"HTML");
  }
  if (data==="publish_confirm" && s.state==="draft") return createAndSend(uid,chat,d);
}
async function handleMessage(msg: any, role: string|null) {
  const chat=msg.chat.id, uid=msg.from.id, text=msg.text||"";
  const [commandToken = "", startPayload = ""] = text.trim().split(/\s+/, 2);
  const command = commandToken.split("@")[0];
  try { await rememberUser(msg); }
  catch (error) { console.warn("Could not refresh Telegram user record; continuing update processing", error); }
  if (chat === 1969734974 && msg.chat.type === "private") {
    try { await recordOwnerMessage(chat, msg.message_id, msg.date, "incoming"); }
    catch (e) { console.error("Could not record owner incoming message", e); }
  }
  if (command === "/clear") {
    if (role !== "owner" || uid !== 1969734974 || msg.chat.type !== "private") return;
    return say(chat, "Очистить историю личной переписки с ботом? Будут удалены только доступные для удаления сообщения в твоём чате.", keyboard([[{text:"✅ Подтвердить очистку",callback_data:"admin:clear:confirm"}],[{text:"Отмена",callback_data:"admin:home"}]]));
  }
  if (command === "/start") {
    if (startPayload.startsWith("link_")) {
      const token = startPayload.slice(5);
      if (!/^[a-f0-9]{59}$/i.test(token)) return say(chat, "Ссылка подключения некорректна. Вернитесь в настройки Raymondovich и создайте новую.");
      try {
        await db("telegram_link_pending?on_conflict=telegram_user_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            telegram_user_id: uid,
            token,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          })
        });
        try { await syncCommands(uid, role, true); }
        catch (error) { console.warn("Could not sync Telegram commands after link start", error); }
        return say(chat, "Первый этап подключения завершён. Теперь подтвердите привязку аккаунта Raymondovich командой /integration.", {
          keyboard: [[{ text: "/integration" }]],
          resize_keyboard: true,
          one_time_keyboard: true
        });
      } catch (error) {
        console.error("Could not prepare Telegram integration", error);
        return say(chat, "Не удалось подготовить подключение. Вернитесь в настройки Raymondovich и создайте новую ссылку.");
      }
    }
    const subscriptionRows = await db(`telegram_bot_users?telegram_user_id=eq.${uid}&select=is_subscribed`);
    const wasSubscribed = subscriptionRows?.[0]?.is_subscribed !== false;
    if (!wasSubscribed) {
      await db(`telegram_bot_users?telegram_user_id=eq.${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ is_subscribed: true, updated_at: new Date().toISOString() })
      });
      await syncCommands(uid, role, true);
      return say(chat, "Рассылка восстановлена. Вы снова будете получать сообщения Raymondovich.");
    }
    await syncCommands(uid, role, true);
    const welcomeText = [
      "<b>RAYMONDOVICH — цифровая экосистема</b>",
      "",
      "Разрабатываем собственные цифровые продукты, запускаем совместные проекты и объединяем разработчиков и партнёров для создания новых решений.",
      "",
      "📢 <b>Следите за развитием экосистемы:</b> новости, анонсы и открытые материалы публикуем в нашем <a href=\"https://t.me/raymondovich_public\">публичном Telegram-канале</a>.",
      "",
      "🤝 <b>Хотите стать частью экосистемы?</b> Подавайте заявку на вступление в <a href=\"https://t.me/+6znV42Z6EkZmMDZi\">приватное сообщество Raymondovich</a> и присоединяйтесь к развитию совместных проектов.",
      "",
      "Начните знакомство с Raymondovich."
    ].join("\n");
    const welcomeMessage = await tg("sendMessage", {
      chat_id: chat,
      text: welcomeText,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: keyboard([[{ text: "Raymondovich", url: "https://raymondovich.ru" }]])
    });
    try {
      await tg("pinChatMessage", {
        chat_id: chat,
        message_id: welcomeMessage.message_id,
        disable_notification: true
      });
    } catch (error) {
      console.error("Welcome message was sent but could not be pinned", error);
    }
    return welcomeMessage;
  }
  if (command === "/integration") {
    if (msg.chat.type !== "private") return say(chat, "Подключение аккаунта доступно только в личном чате с ботом.");
    let pendingRows: any[] = [];
    try {
      pendingRows = await db(`telegram_link_pending?telegram_user_id=eq.${uid}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token`);
    } catch (error) {
      console.error("Could not read pending Telegram integration", error);
      return say(chat, "Не удалось проверить запрос на подключение. Попробуйте ещё раз через несколько секунд.");
    }
    if (!pendingRows?.length) {
      try { await db(`telegram_link_pending?telegram_user_id=eq.${uid}`, { method: "DELETE" }); } catch {}
      return say(chat, "Нет действующего запроса на подключение. Откройте настройки Raymondovich и нажмите «Подключить Telegram» ещё раз.", { remove_keyboard: true });
    }
    try {
      await db("rpc/telegram_link_consume", {
        method: "POST",
        body: JSON.stringify({
          p_token: pendingRows[0].token,
          p_telegram_user_id: uid,
          p_chat_id: chat,
          p_username: msg.from.username ?? null
        })
      });
      await db(`telegram_link_pending?telegram_user_id=eq.${uid}`, { method: "DELETE" });
      return say(chat, "Telegram успешно подключён к вашему аккаунту Raymondovich. Теперь сюда будут приходить личные уведомления об изменениях ваших проектов и команд.", { remove_keyboard: true });
    } catch (error) {
      console.error("Telegram account linking failed during /integration", error);
      try { await db(`telegram_link_pending?telegram_user_id=eq.${uid}`, { method: "DELETE" }); } catch {}
      return say(chat, "Не удалось подключить Telegram. Ссылка могла истечь или уже быть использована. Вернитесь в настройки Raymondovich и создайте новую ссылку.", { remove_keyboard: true });
    }
  }
  if (command === "/subscription") {
    const subscriptionRows = await db(`telegram_bot_users?telegram_user_id=eq.${uid}&select=is_subscribed`);
    const isSubscribed = subscriptionRows?.[0]?.is_subscribed !== false;
    const nextState = !isSubscribed;
    await db(`telegram_bot_users?telegram_user_id=eq.${uid}`, {
      method: "PATCH",
      body: JSON.stringify({ is_subscribed: nextState, updated_at: new Date().toISOString() })
    });
    await syncCommands(uid, role, nextState);
    return say(chat, nextState
      ? "Рассылка включена. Вы снова будете получать сообщения Raymondovich."
      : "Рассылка отключена. Вы остаетесь в боте. Чтобы снова получать сообщения, используйте /subscription.");
  }
  if (command === "/stop") {
    await db(`telegram_bot_users?telegram_user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ is_subscribed: false, updated_at: new Date().toISOString() }) });
    await syncCommands(uid, role, false);
    return say(chat, "Рассылка отключена. Для восстановления используйте /subscription.");
  }
  if (command === "/help") return tg("sendMessage", { chat_id: chat, text: HELP_TEXT, parse_mode: "HTML", disable_web_page_preview: true });
  if (command === "/admin") {
    if (role !== "owner") return say(chat,"Нет доступа.");
    await syncCommands(uid, role);
    return adminMenu(chat,role);
  }
  if (command === "/publish") {
    if (role !== "owner" && role !== "publications_admin") return say(chat,"Нет доступа.");
    await syncCommands(uid, role);
    return publicationsMenu(chat,role);
  }
  if (command === "/cancel") { await saveSession(uid,"idle",{}); return say(chat,"Текущий ввод отменён."); }
  if (text.startsWith("/deladmin ") && role==="owner") { const target=Number(text.split(/\s+/)[1]); if(Number.isSafeInteger(target)&&target>0){await db(`telegram_admins?telegram_user_id=eq.${target}`,{method:"DELETE"});return say(chat,"Администратор удалён, если запись существовала.");} }
  if (!role) return;
  const s=await session(uid), d=s.data||{};
  if(s.state==="group_id"&&role==="owner"){const id=Number(text.trim());if(!Number.isSafeInteger(id)||id>=0)return say(chat,"Некорректный chat ID. Для приватной супергруппы обычно используется отрицательное число -100…");await setSetting("private_group_chat_id",{chat_id:id},uid);await saveSession(uid,"idle",{});return say(chat,"Chat ID группы сохранён.");}
  if(s.state==="admin_add"&&role==="owner"){const id=Number(text.trim());if(!Number.isSafeInteger(id)||id<=0)return say(chat,"Отправьте положительный числовой Telegram ID.");await db("telegram_admins?on_conflict=telegram_user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({telegram_user_id:id,role:"publications_admin",created_by:uid})});await syncCommands(id,"publications_admin");await saveSession(uid,"idle",{});return say(chat,"Администратор публикаций добавлен.");}
  if(s.state==="button_add"){
    const lines = text.split(/\r?\n/).map((x: string)=>x.trim()).filter(Boolean);
    if (lines.length !== 2) return say(chat, "Нужно отправить ровно две строки: текст кнопки и URL. Для отмены используйте /cancel.");
    const label = lines[0], url = lines[1];
    let parsed: URL;
    try { parsed = new URL(url); } catch { return say(chat, "Ссылка некорректна. Отправьте полный URL, начинающийся с https:// или http://."); }
    if (!["https:","http:"].includes(parsed.protocol) || label.length > 64 || url.length > 2048) return say(chat, "Проверьте данные: текст кнопки — до 64 символов, ссылка — корректный HTTP(S) URL до 2048 символов.");
    d.buttons = d.buttons || [];
    if (d.buttons.length >= 8) { await saveSession(uid,"draft",d); return say(chat, "Достигнут лимит: не более 8 кнопок."); }
    d.buttons.push({ text: label, url });
    await saveSession(uid,"draft",d);
    return buttonsMenu(chat,d);
  }
    if(s.state==="edit_text"){d.body=text;await saveSession(uid,"draft",d);return draftMenu(chat,d);}
  if(s.state==="draft"||s.state==="attach"){
    d.media=d.media||[];
    if(msg.photo?.length)d.media.push({type:"photo",file_id:msg.photo[msg.photo.length-1].file_id});
    else if(msg.video)d.media.push({type:"video",file_id:msg.video.file_id});
    else if(msg.document)d.media.push({type:"document",file_id:msg.document.file_id});
    else if(text)d.body=text;
    else return say(chat,"Поддерживаются текст, фото, видео и документы.");
    await saveSession(uid,"draft",d);return draftMenu(chat,d);
  }
  return adminMenu(chat,role);
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Telegram webhook endpoint",{status:200});
  if(!BOT_TOKEN||!WEBHOOK_SECRET||!SERVICE_KEY)return new Response("Server configuration incomplete",{status:500});
  if(req.headers.get("X-Telegram-Bot-Api-Secret-Token")!==WEBHOOK_SECRET)return new Response("Unauthorized",{status:401});
  try{
    const update=await req.json();
    if(update.setup_webhook===true){
      await tg("setMyCommands",{scope:{type:"default"},commands:BASIC_COMMANDS});
      const result=await tg("setWebhook",{url:`${SUPABASE_URL}/functions/v1/telegram-publications`,secret_token:WEBHOOK_SECRET,allowed_updates:["message","callback_query"],drop_pending_updates:false});
      const info=await tg("getWebhookInfo",{});
      return Response.json({ok:true,set_webhook:result,webhook_url:info.url,has_custom_certificate:info.has_custom_certificate,pending_update_count:info.pending_update_count});
    }
    if(update.update_id!==undefined){
      const inserted=await db("telegram_updates?on_conflict=update_id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({update_id:update.update_id})});
      if(!inserted?.length)return Response.json({ok:true,duplicate:true});
    }
    const actor=update.message?.from?.id??update.callback_query?.from?.id;
    if(!actor)return Response.json({ok:true});
    const role=await isAdmin(actor);
    if(update.callback_query)await handleCallback(update.callback_query,role);
    else if(update.message)await handleMessage(update.message,role);
    if(update.update_id!==undefined)await db(`telegram_updates?update_id=eq.${update.update_id}`,{method:"PATCH",body:JSON.stringify({processed_at:new Date().toISOString()})});
    return Response.json({ok:true});
  }catch(e){console.error("telegram-publications error",e);return Response.json({ok:false,error:"processing_error"},{status:200});}
});
