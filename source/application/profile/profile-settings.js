import {
  validateEmailChange,
  validatePasswordChange,
  validateProfileChanges,
} from "../../domain/profile/profile-data.js";

/** Application use cases are composed with an infrastructure gateway by Presentation. */
export function createProfileSettingsUseCases(gateway) {
  if (!gateway) throw new Error("Profile settings gateway is required.");

  return {
    load: () => gateway.load(),
    updateDetails(changes) {
      return gateway.updateDetails(validateProfileChanges(changes));
    },
    changePassword(input) {
      validatePasswordChange(input);
      return gateway.changePassword(input);
    },
    changeEmail(input) {
      validateEmailChange(input);
      return gateway.changeEmail(input);
    },
  };
}
