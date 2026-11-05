import { supabase } from "../client.js";

export const authGateway = {
  getSession: () => supabase.auth.getSession(),
  signUp: (credentials) => supabase.auth.signUp(credentials),
  signInWithPassword: (credentials) => supabase.auth.signInWithPassword(credentials),
  resetPasswordForEmail: (email, options) => supabase.auth.resetPasswordForEmail(email, options),
  updateUser: (attributes) => supabase.auth.updateUser(attributes),
  signOut: () => supabase.auth.signOut(),
  exchangeCodeForSession: (search) => supabase.auth.exchangeCodeForSession(search),
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
};
