import { createAccountSettingsService } from "../../application/account/account-settings.js";
import { accountGateway } from "../../infrastructure/supabase/gateways/account-gateway.js";

const accountSettings = createAccountSettingsService({ accountGateway });

export const {
  getAccountSettings,
  updateProfileSettings,
  updateAccountEmail,
  updateAccountPassword,
} = accountSettings;
