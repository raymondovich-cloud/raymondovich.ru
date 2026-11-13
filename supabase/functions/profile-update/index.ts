import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const allowedOrigins = new Set(["https://raymondovich.ru", "https://www.raymondovich.ru"]);

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://raymondovich.ru",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...headers(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(origin) });
  if (req.method !== "GET" && req.method !== "PATCH") return json({ error: "Method not allowed" }, 405, origin);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401, origin);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) {
      console.error("Required profile function environment variables are missing.");
      return json({ error: "Profile service is temporarily unavailable." }, 503, origin);
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user) return json({ error: "Session is invalid or expired." }, 401, origin);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (req.method === "GET") {
      const { data: profile, error } = await admin.rpc("profile_settings_get", { p_user_id: user.id });
      if (error || !profile) {
        console.error("Profile read failed:", error?.message ?? "Profile not found");
        return json({ error: "Не удалось загрузить данные профиля." }, 500, origin);
      }
      return json({ profile, email: user.email ?? null }, 200, origin);
    }

    let payload: unknown;
    try { payload = await req.json(); } catch { return json({ error: "Некорректный JSON." }, 400, origin); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return json({ error: "Некорректные данные." }, 400, origin);
    }
    const input = payload as Record<string, unknown>;
    const keys = Object.keys(input);
    if (!keys.length || keys.some((key) => key !== "full_name" && key !== "birth_date")) {
      return json({ error: "Можно изменить только ФИО и дату рождения." }, 400, origin);
    }

    const args: Record<string, string | null> = {
      p_user_id: user.id,
      p_full_name: null,
      p_birth_date: null,
    };
    if (Object.hasOwn(input, "full_name")) {
      const value = typeof input.full_name === "string" ? input.full_name.trim().replace(/\s+/g, " ") : "";
      if (value.length < 3 || value.length > 160) {
        return json({ error: "ФИО должно содержать от 3 до 160 символов." }, 400, origin);
      }
      args.p_full_name = value;
    }
    if (Object.hasOwn(input, "birth_date")) {
      const value = typeof input.birth_date === "string" ? input.birth_date : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return json({ error: "Укажите корректную дату рождения." }, 400, origin);
      }
      const parsed = new Date(value + "T00:00:00.000Z");
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || parsed.getTime() > Date.now()) {
        return json({ error: "Дата рождения указана некорректно." }, 400, origin);
      }
      args.p_birth_date = value;
    }

    const { data: profile, error } = await admin.rpc("profile_settings_update", args);
    if (error || !profile) {
      console.error("Profile update failed:", error?.message ?? "Profile not found");
      return json({ error: "Не удалось сохранить данные профиля." }, 500, origin);
    }
    return json({ profile }, 200, origin);
  } catch (error) {
    console.error("Profile request failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Не удалось выполнить запрос. Попробуйте позже." }, 500, origin);
  }
});
