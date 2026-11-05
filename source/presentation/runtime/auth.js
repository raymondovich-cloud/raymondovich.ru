import { createAuthenticationService } from "../../application/auth/authentication.js";
import { authGateway } from "../../infrastructure/supabase/gateways/auth-gateway.js";
import { profileGateway } from "../../infrastructure/supabase/gateways/profile-gateway.js";

const authentication = createAuthenticationService({
  authGateway,
  profileGateway,
  authCallbackUrl: "https://raymondovich.ru/pages/auth/auth-callback.html",
  passwordResetUrl: "https://raymondovich.ru/pages/auth/update-password.html",
});

export const {
  getSession,
  register,
  requestPasswordReset,
  updatePassword,
  login,
  logout,
  getRole,
  completeAuthCallback,
  subscribeToPasswordRecovery,
} = authentication;
