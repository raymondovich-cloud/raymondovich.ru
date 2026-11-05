import { supabase } from "../client.js";

export const profileGateway = {
  async ensureProfile(user, displayName) {
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      display_name: displayName || user.user_metadata?.display_name || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
  },
};
