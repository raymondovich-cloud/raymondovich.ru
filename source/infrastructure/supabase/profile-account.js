import { supabase } from "./client.js";

export async function updateAccountEmail(email) {
  const { data, error } = await supabase.auth.updateUser({ email });
  return { user: data?.user || null, error: error || null };
}

export async function updateAccountPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  return { user: data?.user || null, error: error || null };
}
