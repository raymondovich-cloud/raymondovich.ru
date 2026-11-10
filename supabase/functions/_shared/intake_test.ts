import {
  escapeTelegramHtml,
  escapeTelegramHtmlTruncated,
  normalizeText,
  parseIntakeSource,
  resolveIntakeStartParam,
  validateTelegramInitData,
} from "./intake.ts";

const encoder = new TextEncoder();
const BOT_TOKEN = "123456:TEST_TOKEN_FOR_UNIT_TESTS_ONLY";

async function sign(keyBytes: Uint8Array, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signedInitData(startParam = "ig_campaign1", authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    start_param: startParam,
    user: JSON.stringify({ id: 123456789, first_name: "Test", username: "test_user", language_code: "ru" }),
  });
  const checkString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = await sign(encoder.encode("WebAppData"), BOT_TOKEN);
  params.set("hash", hex(await sign(secret, checkString)));
  return params.toString();
}

Deno.test("valid signed initData is accepted and user is extracted", async () => {
  const result = await validateTelegramInitData(await signedInitData(), BOT_TOKEN);
  if (result.user.id !== 123456789 || result.user.username !== "test_user") {
    throw new Error("Verified Telegram user was not extracted");
  }
});

Deno.test("tampered start_param invalidates the signature", async () => {
  const raw = await signedInitData();
  const tampered = raw.replace("ig_campaign1", "threads_campaign1");
  let rejected = false;
  try {
    await validateTelegramInitData(tampered, BOT_TOKEN);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Tampered initData was accepted");
});

Deno.test("expired initData is rejected", async () => {
  const raw = await signedInitData("tg", Math.floor(Date.now() / 1000) - 86401);
  let rejected = false;
  try {
    await validateTelegramInitData(raw, BOT_TOKEN);
  } catch (error) {
    rejected = error instanceof Error && error.message === "expired_init_data";
  }
  if (!rejected) throw new Error("Expired initData was accepted");
});

Deno.test("future initData is rejected", async () => {
  const raw = await signedInitData("tg", Math.floor(Date.now() / 1000) + 61);
  let rejected = false;
  try {
    await validateTelegramInitData(raw, BOT_TOKEN);
  } catch (error) {
    rejected = error instanceof Error && error.message === "expired_init_data";
  }
  if (!rejected) throw new Error("Future initData was accepted");
});

Deno.test("name and message input is normalized and control characters are rejected", () => {
  if (normalizeText("  Bogdan  ", 80, "name") !== "Bogdan") {
    throw new Error("Name normalization failed");
  }
  let rejected = false;
  try {
    normalizeText("bad\u0001input", 1000, "message");
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Control character was accepted");
});

Deno.test("duplicate initData keys are rejected", async () => {
  const raw = await signedInitData();
  let rejected = false;
  try {
    await validateTelegramInitData(raw + "&start_param=site", BOT_TOKEN);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Duplicate key was accepted");
});

Deno.test("source and campaign are normalized through the allowlist", () => {
  const valid = parseIntakeSource("threads_spring2026");
  const invalid = parseIntakeSource("instagram");
  if (valid.source !== "threads" || valid.campaign !== "spring2026") {
    throw new Error("Valid source/campaign mapping failed");
  }
  if (invalid.source !== "other" || invalid.campaign !== null) {
    throw new Error("Invalid source was not normalized");
  }
});

Deno.test("Telegram HTML values are escaped", () => {
  const result = escapeTelegramHtml("<b>test & 'quoted'</b>");
  if (result !== "&lt;b&gt;test &amp; &#39;quoted&#39;&lt;/b&gt;") {
    throw new Error("HTML escaping failed");
  }
});

Deno.test("escaped notification text is truncated without exceeding its HTML budget", () => {
  const result = escapeTelegramHtmlTruncated("&".repeat(1000), 2200);
  if (result.length > 2201 || !result.endsWith("…")) {
    throw new Error("Escaped notification truncation failed");
  }
});

Deno.test("signed start_param takes precedence over client attribution", () => {
  const result = resolveIntakeStartParam("threads_spring", "ig_paid");
  if (result.value !== "threads_spring" || result.signed !== true) {
    throw new Error("Signed start_param was not preferred");
  }
});

Deno.test("client start_param is retained only as an unsigned attribution hint", () => {
  const result = resolveIntakeStartParam(null, "ig_campaign");
  if (result.value !== "ig_campaign" || result.signed !== false) {
    throw new Error("Unsigned attribution hint was not marked correctly");
  }
});

Deno.test("invalid signed start_param is not replaced by a client hint", () => {
  const result = resolveIntakeStartParam("not-allowed", "ig_paid");
  if (result.value !== "not-allowed" || result.signed !== true) {
    throw new Error("Invalid signed start_param incorrectly fell back to client input");
  }
  const source = parseIntakeSource(result.value);
  if (source.source !== "other" || source.campaign !== null) {
    throw new Error("Invalid signed start_param was not normalized to other");
  }
});

Deno.test("oversized client attribution hint is discarded", () => {
  const result = resolveIntakeStartParam(null, "ig_" + "a".repeat(100));
  if (result.value !== null || result.signed !== false) {
    throw new Error("Oversized client attribution hint was accepted");
  }
});
