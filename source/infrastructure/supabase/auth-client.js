import { createProjectApi } from "./project-api.js";

/* Version: 1.7.0 */
/* Updated: 2026-11-16 */

const SUPABASE_URL = "https://yajybgdorhxebbigwjgi.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_2d3FG3DEk49zKUdJDm3VrA_SAwLL1pp";
const SESSION_KEY = "raymondovich-auth-session";
const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

function readSession() {
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (!session?.access_token || !session?.refresh_token) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const normalized = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
    user: session.user ?? null,
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  return normalized;
}

async function request(path, { method = "GET", body, accessToken, redirectTo } = {}) {
  const url = new URL(`${SUPABASE_URL}${path}`);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);

  const headers = {
    apikey: SUPABASE_PUBLIC_KEY,
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.msg || payload.message || payload.error_description || payload.error || "Не удалось выполнить запрос.");
    error.status = response.status;
    error.code = payload.code || payload.error_code || null;
    throw error;
  }

  return payload;
}

function normalizeSession(payload) {
  if (!payload?.access_token || !payload?.refresh_token) return null;
  return saveSession(payload);
}

export const authClient = {
  async signUp({ email, password, fullName, birthDate, username }) {
    return request("/auth/v1/signup", {
      method: "POST",
      redirectTo: `${window.location.origin}/`,
      body: {
        email,
        password,
        data: {
          full_name: fullName,
          birth_date: birthDate,
          username,
        },
      },
    });
  },

  async signIn(identifier, password) {
    const normalized = identifier.trim().toLowerCase();
    let payload;

    if (normalized.includes("@")) {
      payload = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email: normalized, password },
      });
    } else {
      const response = await fetch(`${EDGE_FUNCTIONS_URL}/username-sign-in`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: normalized, password }),
      });

      payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || "Неверный логин или пароль.");
        error.status = response.status;
        throw error;
      }
      payload = payload.session;
    }

    const session = normalizeSession(payload);
    if (!session) throw new Error("Сервис авторизации не вернул активную сессию.");
    return session;
  },

  async requestPasswordReset(email) {
    return request("/auth/v1/recover", {
      method: "POST",
      redirectTo: `${window.location.origin}/`,
      body: { email: email.trim().toLowerCase() },
    });
  },

  async resendConfirmation(email) {
    return request("/auth/v1/resend", {
      method: "POST",
      redirectTo: `${window.location.origin}/`,
      body: { type: "signup", email: email.trim().toLowerCase() },
    });
  },

  async updatePassword(password) {
    const session = await this.getSession();
    if (!session) throw new Error("Сессия восстановления недействительна. Запросите новое письмо.");
    const user = await request("/auth/v1/user", {
      method: "PUT",
      accessToken: session.access_token,
      body: { password },
    });
    saveSession({ ...session, user });
    return user;
  },

  async getSession() {
    const session = readSession();
    if (!session) return null;

    if (Number(session.expires_at) > Math.floor(Date.now() / 1000) + 60) return session;

    try {
      const refreshed = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token },
      });
      return normalizeSession(refreshed);
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  async getProfile() {
    const session = await this.getSession();
    if (!session) throw new Error("Сессия пользователя не найдена.");

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/profile-update`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Не удалось загрузить профиль.");
    }
    return payload;
  },

  async updateProfile(profile) {
    const session = await this.getSession();
    if (!session) throw new Error("Сессия пользователя не найдена.");
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/profile-update`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Не удалось сохранить профиль.");
    return payload;
  },

  async getUser() {
    const session = await this.getSession();
    if (!session) return null;

    try {
      const user = await request("/auth/v1/user", { accessToken: session.access_token });
      saveSession({ ...session, user });
      return user;
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  async createProject(input) {
    return createProjectApi({
      getSession: () => this.getSession(),
      request,
    }).createProject(input);
  },

  async getProjects() {
    return createProjectApi({
      getSession: () => this.getSession(),
      request,
    }).getProjects();
  },

  async getProjectMembers(projectId) {
    return createProjectApi({
      getSession: () => this.getSession(),
      request,
    }).getProjectMembers(projectId);
  },

  async addProjectMember(input) {
    return createProjectApi({
      getSession: () => this.getSession(),
      request,
    }).addProjectMember(input);
  },

  async deleteProject(input) {
    return createProjectApi({
      getSession: () => this.getSession(),
      request,
    }).deleteProject(input);
  },

  async signOut() {
    const session = await this.getSession();
    if (session) {
      try {
        await request("/auth/v1/logout", {
          method: "POST",
          accessToken: session.access_token,
        });
      } finally {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  },

  acceptRedirectSession(session) {
    return normalizeSession(session);
  },

  clearSession() {
    window.localStorage.removeItem(SESSION_KEY);
  },
};
