// version 1.0
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const supabaseUrl = "https://ewwpnahjhqcbtfszthhc.supabase.co";
const supabasePublishableKey = "sb_publishable_x6dcpZ70rZ5FsOcShf3Fxg_pbXHFzYm";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
