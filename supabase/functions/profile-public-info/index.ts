import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const allowedOrigins = new Set(["https://raymondovich.ru", "https://www.raymondovich.ru", "https://dev.raymondovich.ru"]);
function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://raymondovich.ru",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "PATCH, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "PATCH") return json({ error: "Method not allowed" }, 405, origin);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401, origin);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Profile service is temporarily unavailable." }, 503, origin);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) return json({ error: "Session is invalid or expired." }, 401, origin);
    let payload: unknown;
    try { payload = await req.json(); } catch { return json({ error: "Некорректный JSON." }, 400, origin); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Некорректные данные." }, 400, origin);
    const input = payload as Record<string, unknown>;
    const allowed = new Set(["public_profile_enabled", "about", "instagram_url", "youtube_url", "telegram_url", "showcase_project_ids"]);
    if (!Object.keys(input).length || Object.keys(input).some((key) => !allowed.has(key))) return json({ error: "Переданы неизвестные поля." }, 400, origin);
    if (typeof input.public_profile_enabled !== "boolean") return json({ error: "Укажите, включён ли публичный профиль." }, 400, origin);
    const about = input.about === undefined || input.about === null ? "" : input.about;
    if (typeof about !== "string" || [...about].length > 80) return json({ error: "Текст «О себе» не должен превышать 80 символов." }, 400, origin);
    const normalize = (key: string, host: RegExp, path: RegExp): string | null => {
      const raw = input[key];
      if (raw === undefined || raw === null || raw === "") return null;
      if (typeof raw !== "string" || raw.length > 2048) throw new Error("Некорректная ссылка: " + key);
      let parsed: URL;
      try { parsed = new URL(raw.trim()); } catch { throw new Error("Укажите полную ссылку с https://."); }
      if (parsed.protocol !== "https:" || !host.test(parsed.hostname) || !path.test(parsed.pathname + parsed.search)) throw new Error("Ссылка не соответствует выбранной социальной сети.");
      return parsed.toString();
    };
    const instagram = normalize("instagram_url", /^(www\.)?instagram\.com$/i, /^\/[A-Za-z0-9._-]+\/?$/);
    const youtube = normalize("youtube_url", /^(www\.)?(youtube\.com|youtu\.be)$/i, /^\/(channel|c|user|@)[^\s]*$|^\/[A-Za-z0-9_-]+$/);
    const telegram = normalize("telegram_url", /^(t\.me|telegram\.me)$/i, /^\/[A-Za-z0-9_+/?=-]+$/);
    const projectIds = input.showcase_project_ids ?? [];
    if (!Array.isArray(projectIds) || projectIds.length > 12 || projectIds.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return json({ error: "Выберите не более 12 корректных проектов." }, 400, origin);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: updateError } = await admin.rpc("profile_public_info_update", {
      p_user_id: data.user.id,
      p_enabled: input.public_profile_enabled,
      p_about: about.trim() || null,
      p_instagram_url: instagram,
      p_youtube_url: youtube,
      p_telegram_url: telegram,
      p_project_ids: projectIds,
    });
    if (updateError || !profile) {
      console.error("Public profile update failed:", updateError?.message ?? "Profile not found");
      return json({ error: updateError?.message?.includes("showcased") ? "Можно добавлять только собственные активные проекты." : "Не удалось сохранить публичную информацию." }, 400, origin);
    }
    return json({ profile }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Не удалось выполнить запрос." }, 400, origin);
  }
});
