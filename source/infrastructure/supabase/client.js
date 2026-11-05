// version 1.0
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yajybgdorhxebbigwjgi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2d3FG3DEk49zKUdJDm3VrA_SAwLL1pp";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
