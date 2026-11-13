/** Pure validation rules for the Profile bounded context. */
export function validateProfileChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new Error("Некорректные данные профиля.");
  }
  const keys = Object.keys(changes);
  if (!keys.length || keys.some((key) => key !== "full_name" && key !== "birth_date")) {
    throw new Error("Можно изменить только ФИО и дату рождения.");
  }

  const normalized = {};
  if (Object.hasOwn(changes, "full_name")) {
    const value = typeof changes.full_name === "string"
      ? changes.full_name.trim().replace(/\s+/g, " ")
      : "";
    if (value.length < 3 || value.length > 160) {
      throw new Error("ФИО должно содержать от 3 до 160 символов.");
    }
    normalized.full_name = value;
  }
  if (Object.hasOwn(changes, "birth_date")) {
    const value = typeof changes.birth_date === "string" ? changes.birth_date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("Укажите корректную дату рождения.");
    }
    const date = new Date(value + "T00:00:00.000Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getTime() > Date.now()) {
      throw new Error("Дата рождения указана некорректно.");
    }
    normalized.birth_date = value;
  }
  return normalized;
}

export function validatePasswordChange({ currentPassword, newPassword }) {
  if (typeof currentPassword !== "string" || currentPassword.length < 1) {
    throw new Error("Введите текущий пароль.");
  }
  if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128) {
    throw new Error("Новый пароль должен содержать от 10 до 128 символов.");
  }
  if (currentPassword === newPassword) {
    throw new Error("Новый пароль должен отличаться от текущего.");
  }
}

export function validateEmailChange({ currentPassword, newEmail }) {
  if (typeof currentPassword !== "string" || currentPassword.length < 1) {
    throw new Error("Введите текущий пароль.");
  }
  if (typeof newEmail !== "string" || newEmail.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
    throw new Error("Укажите корректный Email.");
  }
}
