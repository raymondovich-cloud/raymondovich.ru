import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

export const supabase = createClient(
  "https://yajybgdorhxebbigwjgi.supabase.co",
  "sb_publishable_2d3FG3DEk49zKUdJDm3VrA_SAwLL1pp",
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  },
);
