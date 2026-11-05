import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticationService } from "../../source/application/auth/authentication.js";

function createGateway(overrides = {}) {
  const calls = [];
  const gateway = {
    async getSession() { calls.push(["getSession"]); return { data: { session: { user: { id: "user-1" } } }, error: null }; },
    async signUp(credentials) { calls.push(["signUp", credentials]); return { data: { session: { user: { id: "user-1" } } }, error: null }; },
    async signInWithPassword(credentials) { calls.push(["signInWithPassword", credentials]); return { data: { user: { id: "user-1", user_metadata: {} } }, error: null }; },
    async resetPasswordForEmail(email, options) { calls.push(["resetPasswordForEmail", email, options]); return { error: null }; },
    async updateUser(attributes) { calls.push(["updateUser", attributes]); return { data: { user: { id: "user-1" } }, error: null }; },
    async signOut() { calls.push(["signOut"]); return { error: null }; },
    async exchangeCodeForSession(search) { calls.push(["exchangeCodeForSession", search]); return { data: { session: { user: { id: "user-1" } } }, error: null }; },
    onAuthStateChange(callback) { calls.push(["onAuthStateChange", callback]); return { data: { subscription: { unsubscribe() { calls.push(["unsubscribe"]); } } } }; },
    ...overrides,
  };
  return { gateway, calls };
}

test("getSession returns the active session", async () => {
  const { gateway } = createGateway();
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/reset" });
  assert.equal((await service.getSession()).user.id, "user-1");
});

test("register passes callback URL and creates a profile when a session is returned", async () => {
  const { gateway, calls } = createGateway();
  const profileCalls = [];
  const service = createAuthenticationService({
    authGateway: gateway,
    profileGateway: { async ensureProfile(user, name) { profileCalls.push([user.id, name]); } },
    authCallbackUrl: "/auth/callback",
    passwordResetUrl: "/auth/reset",
  });
  await service.register({ email: "person@example.com", password: "long-password", displayName: "Person" });
  const args = calls.find(([name]) => name === "signUp")[1];
  assert.equal(args.options.emailRedirectTo, "/auth/callback");
  assert.equal(args.options.data.display_name, "Person");
  assert.deepEqual(profileCalls, [["user-1", "Person"]]);
});

test("register does not create a profile before email-confirmation session exists", async () => {
  const { gateway } = createGateway({
    async signUp() { return { data: { session: null }, error: null }; },
  });
  let profileCalls = 0;
  const service = createAuthenticationService({
    authGateway: gateway,
    profileGateway: { async ensureProfile() { profileCalls += 1; } },
    authCallbackUrl: "/callback",
    passwordResetUrl: "/reset",
  });
  await service.register({ email: "person@example.com", password: "long-password", displayName: "Person" });
  assert.equal(profileCalls, 0);
});

test("login creates or refreshes the user profile after successful authentication", async () => {
  const { gateway } = createGateway();
  const profileCalls = [];
  const service = createAuthenticationService({
    authGateway: gateway,
    profileGateway: { async ensureProfile(user, name) { profileCalls.push([user.id, name]); } },
    authCallbackUrl: "/callback",
    passwordResetUrl: "/reset",
  });
  await service.login({ email: "person@example.com", password: "long-password" });
  assert.deepEqual(profileCalls, [["user-1", ""]]);
});

test("password reset uses the configured recovery callback", async () => {
  const { gateway, calls } = createGateway();
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/auth/update-password" });
  await service.requestPasswordReset("person@example.com");
  assert.deepEqual(calls.find(([name]) => name === "resetPasswordForEmail").slice(1), ["person@example.com", { redirectTo: "/auth/update-password" }]);
});

test("completeAuthCallback exchanges the supplied query string", async () => {
  const { gateway, calls } = createGateway();
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/reset" });
  await service.completeAuthCallback("?code=abc");
  assert.deepEqual(calls.find(([name]) => name === "exchangeCodeForSession"), ["exchangeCodeForSession", "?code=abc"]);
});

test("completeAuthCallback reuses the implicit-flow session when no PKCE code is present", async () => {
  const { gateway, calls } = createGateway();
  const service = createAuthenticationService({
    authGateway: gateway,
    profileGateway: {},
    authCallbackUrl: "/callback",
    passwordResetUrl: "/reset",
  });
  const session = await service.completeAuthCallback("#access_token=implicit-token");
  assert.equal(session.user.id, "user-1");
  assert.ok(calls.some(([name]) => name === "getSession"));
  assert.equal(calls.some(([name]) => name === "exchangeCodeForSession"), false);
});

test("completeAuthCallback returns null when an implicit callback has no session", async () => {
  const { gateway, calls } = createGateway({
    async getSession() { calls.push(["getSession"]); return { data: { session: null }, error: null }; },
  });
  const service = createAuthenticationService({
    authGateway: gateway,
    profileGateway: {},
    authCallbackUrl: "/callback",
    passwordResetUrl: "/reset",
  });
  assert.equal(await service.completeAuthCallback(""), null);
  assert.ok(calls.some(([name]) => name === "getSession"));
});

test("getRole defaults to user and reads only app metadata", () => {
  const { gateway } = createGateway();
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/reset" });
  assert.equal(service.getRole(null), "user");
  assert.equal(service.getRole({ user: { user_metadata: { role: "admin" } } }), "user");
  assert.equal(service.getRole({ user: { app_metadata: { role: "admin" } } }), "admin");
});

test("password recovery subscription can be unsubscribed", () => {
  const { gateway, calls } = createGateway();
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/reset" });
  const unsubscribe = service.subscribeToPasswordRecovery(() => {});
  unsubscribe();
  assert.deepEqual(calls.map(([name]) => name), ["onAuthStateChange", "unsubscribe"]);
});

test("authentication errors are normalized", async () => {
  const { gateway } = createGateway({
    async signInWithPassword() { return { data: null, error: new Error("Invalid login credentials") }; },
  });
  const service = createAuthenticationService({ authGateway: gateway, profileGateway: {}, authCallbackUrl: "/callback", passwordResetUrl: "/reset" });
  await assert.rejects(() => service.login({ email: "bad@example.com", password: "bad-password" }), /Неверный email или пароль/);
});
