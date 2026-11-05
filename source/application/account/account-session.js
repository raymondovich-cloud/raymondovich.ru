// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

export async function signOutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || "Не удалось завершить сеанс.");
}
