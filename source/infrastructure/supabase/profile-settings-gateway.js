import { supabase } from "./client.js";

async function invokeProfile(method, body) {
  const options = { method };
  if (body) options.body = body;
  const { data, error } = await supabase.functions.invoke("profile-update", options);
  if (error) throw new Error(data?.error || error.message || "Не удалось выполнить запрос к профилю.");
  if (data?.error) throw new Error(data.error);
  return data;
}

async function reauthenticate(email, currentPassword) {
  if (!email) throw new Error("У аккаунта не найден Email для повторной проверки.");
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (error) throw new Error("Текущий пароль указан неверно.");
}

export const profileSettingsGateway = {
  load: () => invokeProfile("GET"),
  updateDetails: (changes) => invokeProfile("PATCH", changes),
  async changePassword({ email, currentPassword, newPassword }) {
    await reauthenticate(email, currentPassword);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  async changeEmail({ email, currentPassword, newEmail }) {
    await reauthenticate(email, currentPassword);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) throw error;
  },
};
