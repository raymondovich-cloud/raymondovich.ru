import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "/source/config/app-config.js";

export async function submitApplication(values) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/intake-website-submit`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) return { ok: false, code: result.error || "request_failed" };
  return { ok: true, duplicate: Boolean(result.duplicate) };
}
