import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "/source/config/app-config.js";

// Keep a second ESM CDN as a fallback: if the primary host is unavailable,
// the auth module must still be able to initialize.
let supabaseModule;
try {
  supabaseModule = await import("https://esm.sh/@supabase/supabase-js@2");
} catch (primaryError) {
  try {
    supabaseModule = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  } catch (fallbackError) {
    console.error("Supabase client could not be loaded from either CDN.", {
      primaryError,
      fallbackError
    });
    throw new Error("Не удалось загрузить библиотеку защищённой авторизации. Проверьте подключение и обновите страницу.");
  }
}

const { createClient } = supabaseModule;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
