// version 2.0
function normalizeError(error) {
  if (!error) return null;
  const message = error.message || "Операция не выполнена.";
  if (message.includes("User already registered")) return new Error("Этот адрес электронной почты уже используется.");
  if (message.includes("Email rate limit exceeded")) return new Error("Слишком много запросов. Попробуйте позже.");
  return new Error(message);
}

export function createAccountSettingsService({ accountGateway }) {
  return {
    async getAccountSettings() {
      const { data, error } = await accountGateway.getUser();
      if (error) throw normalizeError(error);
      if (!data.user) return null;
      return {
        email: data.user.email || "",
        firstName: data.user.user_metadata?.first_name || "",
        lastName: data.user.user_metadata?.last_name || "",
        timezone: data.user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      };
    },

    async updateProfileSettings({ firstName, lastName, timezone }) {
      const { data: current, error: currentError } = await accountGateway.getUser();
      if (currentError) throw normalizeError(currentError);
      if (!current.user) throw new Error("Необходимо войти в аккаунт.");
      const { data, error } = await accountGateway.updateUser({
        data: {
          ...(current.user.user_metadata || {}),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          timezone,
        },
      });
      if (error) throw normalizeError(error);
      return data.user;
    },

    async updateAccountEmail(email) {
      const { error } = await accountGateway.updateUser({ email: email.trim() });
      if (error) throw normalizeError(error);
    },

    async updateAccountPassword(password) {
      const { error } = await accountGateway.updateUser({ password });
      if (error) throw normalizeError(error);
    },
  };
}
