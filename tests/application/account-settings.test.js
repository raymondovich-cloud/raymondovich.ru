import test from "node:test";
import assert from "node:assert/strict";
import { createAccountSettingsService } from "../../source/application/account/account-settings.js";

function createGateway({ user = null, updateError = null } = {}) {
  const calls = [];
  return {
    calls,
    async getUser() { calls.push(["getUser"]); return { data: { user }, error: null }; },
    async updateUser(attributes) {
      calls.push(["updateUser", attributes]);
      if (updateError) return { data: null, error: updateError };
      return { data: { user: { id: user?.id || "user-1", user_metadata: attributes.data || user?.user_metadata || {} } }, error: null };
    },
  };
}

test("getAccountSettings returns null without an authenticated user", async () => {
  const accountGateway = createGateway();
  const service = createAccountSettingsService({ accountGateway });
  assert.equal(await service.getAccountSettings(), null);
});

test("getAccountSettings maps account metadata to presentation-independent fields", async () => {
  const accountGateway = createGateway({
    user: {
      id: "user-1",
      email: "person@example.com",
      user_metadata: { first_name: "Ada", last_name: "Lovelace", timezone: "Europe/London" },
    },
  });
  const service = createAccountSettingsService({ accountGateway });
  assert.deepEqual(await service.getAccountSettings(), {
    email: "person@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    timezone: "Europe/London",
  });
});

test("updateProfileSettings preserves unrelated metadata and trims names", async () => {
  const accountGateway = createGateway({
    user: { id: "user-1", user_metadata: { display_name: "Ada", locale: "ru" } },
  });
  const service = createAccountSettingsService({ accountGateway });
  await service.updateProfileSettings({ firstName: " Ada ", lastName: " Lovelace ", timezone: "Europe/London" });
  const update = accountGateway.calls.find(([name]) => name === "updateUser")[1];
  assert.deepEqual(update.data, {
    display_name: "Ada",
    locale: "ru",
    first_name: "Ada",
    last_name: "Lovelace",
    timezone: "Europe/London",
  });
});

test("updateProfileSettings rejects when no user is authenticated", async () => {
  const accountGateway = createGateway();
  const service = createAccountSettingsService({ accountGateway });
  await assert.rejects(
    () => service.updateProfileSettings({ firstName: "A", lastName: "B", timezone: "UTC" }),
    /Необходимо войти в аккаунт/,
  );
  assert.equal(accountGateway.calls.some(([name]) => name === "updateUser"), false);
});

test("updateAccountEmail trims the requested address", async () => {
  const accountGateway = createGateway({ user: { id: "user-1", user_metadata: {} } });
  const service = createAccountSettingsService({ accountGateway });
  await service.updateAccountEmail(" person@example.com ");
  assert.deepEqual(accountGateway.calls.find(([name]) => name === "updateUser")[1], { email: "person@example.com" });
});

test("updateAccountPassword forwards the new password", async () => {
  const accountGateway = createGateway({ user: { id: "user-1", user_metadata: {} } });
  const service = createAccountSettingsService({ accountGateway });
  await service.updateAccountPassword("new-password-123");
  assert.deepEqual(accountGateway.calls.find(([name]) => name === "updateUser")[1], { password: "new-password-123" });
});

test("account gateway errors are normalized", async () => {
  const accountGateway = createGateway({ updateError: new Error("Email rate limit exceeded") });
  const service = createAccountSettingsService({ accountGateway });
  await assert.rejects(() => service.updateAccountEmail("person@example.com"), /Слишком много запросов/);
});
