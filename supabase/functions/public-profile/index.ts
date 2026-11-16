import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const allowedOrigins = new Set(["https://raymondovich.ru", "https://www.raymondovich.ru", "https://dev.raymondovich.ru"]);
function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://raymondovich.ru",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, origin);
  const username = new URL(req.url).searchParams.get("username")?.trim() ?? "";
  if (!/^[a-z0-9][a-z0-9._-]{2,23}$/i.test(username)) return json({ error: "Публичный профиль не найден." }, 404, origin);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Profile service is temporarily unavailable." }, 503, origin);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("profile_public_get", { p_username: username });
    if (error) {
      console.error("Public profile lookup failed:", error.message);
      return json({ error: "Не удалось загрузить публичный профиль." }, 500, origin);
    }
    if (!data?.profile) return json({ error: "Этот публичный профиль недоступен." }, 404, origin);
    return json(data, 200, origin);
  } catch (error) {
    console.error("Public profile request failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Не удалось загрузить публичный профиль." }, 500, origin);
  }
});
