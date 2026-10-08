// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || "Операция не выполнена.";

  if (message.includes("Invalid login credentials")) {
    return new Error("Неверный email или пароль.");
  }

  if (message.includes("User already registered")) {
    return new Error("Пользователь с таким email уже зарегистрирован.");
  }

  return new Error(message);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeError(error);
  }

  return data.session;
}

export async function register({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
      },
    },
  });

  if (error) {
    throw normalizeError(error);
  }

  if (data.session?.user) {
    await ensureProfile(data.session.user, displayName);
  }

  return data;
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw normalizeError(error);
  }

  if (data.user) {
    await ensureProfile(data.user, data.user.user_metadata?.display_name || "");
  }

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeError(error);
  }
}

export function getRole(session) {
  return session?.user?.app_metadata?.role || "user";
}

async function ensureProfile(user, displayName) {
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        display_name: displayName || user.user_metadata?.display_name || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw normalizeError(error);
  }
}
