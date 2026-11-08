import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://yajybgdorhxebbigwjgi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2d3FG3DEk49zKUdJDm3VrA_SAwLL1pp";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
