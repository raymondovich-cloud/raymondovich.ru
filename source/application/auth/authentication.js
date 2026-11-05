// version 2.0
function normalizeError(error) {
  if (!error) return null;
  const message = error.message || "Операция не выполнена.";
  if (message.includes("Invalid login credentials")) return new Error("Неверный email или пароль.");
  if (message.includes("User already registered")) return new Error("Пользователь с таким email уже зарегистрирован.");
  return new Error(message);
}

export function createAuthenticationService({
  authGateway,
  profileGateway,
  authCallbackUrl,
  passwordResetUrl,
}) {
  return {
    async getSession() {
      const { data, error } = await authGateway.getSession();
      if (error) throw normalizeError(error);
      return data.session;
    },

    async register({ email, password, displayName }) {
      const { data, error } = await authGateway.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || null },
          emailRedirectTo: authCallbackUrl,
        },
      });
      if (error) throw normalizeError(error);
      if (data.session?.user) {
        try {
          await profileGateway.ensureProfile(data.session.user, displayName);
        } catch (profileError) {
          throw normalizeError(profileError);
        }
      }
      return data;
    },

    async requestPasswordReset(email) {
      const { error } = await authGateway.resetPasswordForEmail(email, { redirectTo: passwordResetUrl });
      if (error) throw normalizeError(error);
    },

    async updatePassword(password) {
      const { error } = await authGateway.updateUser({ password });
      if (error) throw normalizeError(error);
    },

    async login({ email, password }) {
      const { data, error } = await authGateway.signInWithPassword({ email, password });
      if (error) throw normalizeError(error);
      if (data.user) {
        try {
          await profileGateway.ensureProfile(data.user, data.user.user_metadata?.display_name || "");
        } catch (profileError) {
          throw normalizeError(profileError);
        }
      }
      return data;
    },

    async logout() {
      const { error } = await authGateway.signOut();
      if (error) throw normalizeError(error);
    },

    getRole(session) {
      return session?.user?.app_metadata?.role || "user";
    },

    async completeAuthCallback(search = "") {
      const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      if (!params.has("code")) {
        const { data, error } = await authGateway.getSession();
        if (error) throw normalizeError(error);
        return data.session;
      }

      const { data, error } = await authGateway.exchangeCodeForSession(search);
      if (error) throw normalizeError(error);
      return data.session;
    },

    subscribeToPasswordRecovery(callback) {
      const { data } = authGateway.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") callback(session);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
