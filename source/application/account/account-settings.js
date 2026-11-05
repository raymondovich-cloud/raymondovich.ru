// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

function normalizeError(error) {
  if (!error) return null;
  const message = error.message || "Операция не выполнена.";
  if (message.includes("User already registered")) return new Error("Этот адрес электронной почты уже используется.");
  if (message.includes("Email rate limit exceeded")) return new Error("Слишком много запросов. Попробуйте позже.");
  return new Error(message);
}

export async function getAccountSettings() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw normalizeError(error);
  if (!data.user) return null;
  return {
    email: data.user.email || "",
    firstName: data.user.user_metadata?.first_name || "",
    lastName: data.user.user_metadata?.last_name || "",
    timezone: data.user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

export async function updateProfileSettings({ firstName, lastName, timezone }) {
  const { data, error } = await supabase.auth.updateUser({
    data: { first_name: firstName.trim(), last_name: lastName.trim(), timezone },
  });
  if (error) throw normalizeError(error);
  return data.user;
}

export async function updateAccountEmail(email) {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw normalizeError(error);
}

export async function updateAccountPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw normalizeError(error);
}
