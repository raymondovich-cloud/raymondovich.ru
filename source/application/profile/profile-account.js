import { updateAccountEmail, updateAccountPassword } from "../../infrastructure/supabase/profile-account.js";

export async function changeProfileEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: new Error("Укажите корректный адрес электронной почты.") };
  }
  return updateAccountEmail(email);
}

export async function changeProfilePassword(value, confirmation) {
  const password = String(value || "");
  if (password.length < 10) return { error: new Error("Пароль должен содержать не менее 10 символов.") };
  if (password !== String(confirmation || "")) return { error: new Error("Пароли не совпадают.") };
  return updateAccountPassword(password);
}
