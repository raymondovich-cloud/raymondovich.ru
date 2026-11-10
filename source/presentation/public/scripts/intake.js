import { submitApplication } from "/source/application/intake/intake-submit.js";

const main = document.querySelector("#main");
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SITEKEY = "0x4AAAAAAF7mQ44haZR2d1K4";
let turnstileScriptPromise;

const errorMessages = {
  intake_disabled: "Форма временно недоступна. Попробуйте позже.",
  invalid_name: "Проверьте имя: не более 80 символов.",
  invalid_message: "Проверьте сообщение: от 1 до 1000 символов.",
  invalid_partner_fields: "Заполните обязательные поля о партнёрстве.",
  invalid_portfolio_url: "Укажите корректную ссылку на портфолио с HTTPS.",
  invalid_product_name: "Название продукта должно быть не длиннее 120 символов.",
  invalid_product_url: "Укажите корректную ссылку на продукт с HTTPS.",
  invalid_product_stage: "Выберите стадию продукта.",
  consent_required: "Необходимо согласие с актуальным уведомлением об обработке данных.",
  invalid_challenge: "Подтвердите проверку безопасности и повторите отправку.",
  challenge_unavailable: "Проверка безопасности временно недоступна. Обновите страницу и попробуйте позже.",
  persistence_failed: "Не удалось сохранить заявку. Попробуйте позже.",
  server_configuration_error: "Форма временно недоступна. Попробуйте позже.",
};

function createIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function setNotice(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function ensureTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile-api]');
    const script = existing || document.createElement("script");
    const timeout = window.setTimeout(() => reject(new Error("turnstile_timeout")), 15000);
    const finish = () => {
      window.clearTimeout(timeout);
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("turnstile_unavailable"));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("turnstile_load_failed"));
    }, { once: true });
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileApi = "true";
      document.head.append(script);
    } else if (window.turnstile) {
      finish();
    }
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

function readTouch(timestamp) {
  const url = new URL(window.location.href);
  const touch = {
    source: url.searchParams.get("utm_source") || "direct",
    landing_page: (url.pathname + url.search).slice(0, 512),
    referrer: document.referrer.slice(0, 512),
    captured_at: timestamp,
  };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    touch[key] = (url.searchParams.get(key) || "").slice(0, 120) || null;
  }
  return touch;
}

function initializeIntake(root) {
  if (root.dataset.intakeInitialized === "true") return;
  root.dataset.intakeInitialized = "true";

  const gate = root.querySelector("[data-intake-gate]");
  const legalBlock = root.querySelector("[data-intake-legal-block]");
  const form = root.querySelector("[data-intake-form]");
  const success = root.querySelector("[data-intake-success]");
  const notice = root.querySelector("[data-intake-notice]");
  const counter = root.querySelector("[data-intake-counter]");
  const turnstileContainer = root.querySelector("[data-turnstile-container]");
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !success || !submitButton || !turnstileContainer) return;

  if (gate) gate.hidden = true;
  const noticeVersion = root.dataset.noticeVersion || "";
  if (root.dataset.legalNoticeReady !== "true" || !noticeVersion) {
    legalBlock && (legalBlock.hidden = false);
    form.hidden = true;
    return;
  }

  legalBlock && (legalBlock.hidden = true);
  form.hidden = false;
  submitButton.disabled = true;

  const interestInputs = form.querySelectorAll('input[name="interest"]');
  const conditionalGroups = form.querySelectorAll("[data-intake-fields]");
  const updateConditionalFields = () => {
    const selected = form.querySelector('input[name="interest"]:checked')?.value;
    for (const group of conditionalGroups) {
      const active = group.dataset.intakeFields === selected;
      group.hidden = !active;
      for (const control of group.querySelectorAll("input, select, textarea")) {
        control.disabled = !active;
      }
    }
  };
  interestInputs.forEach((input) => input.addEventListener("change", updateConditionalFields));
  updateConditionalFields();

  const messageInput = form.elements.namedItem("message");
  const updateCounter = () => {
    if (counter && messageInput) counter.textContent = `${[...messageInput.value].length} / 1000`;
  };
  messageInput?.addEventListener("input", updateCounter);
  updateCounter();

  const startedAt = Date.now();
  const firstTouch = readTouch(new Date(startedAt).toISOString());
  let idempotencyKey = createIdempotencyKey();
  let turnstileWidgetId;
  let turnstileToken = "";

  ensureTurnstileScript()
    .then((turnstile) => {
      turnstileWidgetId = turnstile.render(turnstileContainer, {
        sitekey: TURNSTILE_SITEKEY,
        action: "intake_submit",
        callback: (token) => {
          turnstileToken = token;
          submitButton.disabled = false;
          setNotice(notice, "");
        },
        "expired-callback": () => {
          turnstileToken = "";
          submitButton.disabled = true;
        },
        "error-callback": () => {
          turnstileToken = "";
          submitButton.disabled = true;
          setNotice(notice, errorMessages.challenge_unavailable, "error");
        },
      });
    })
    .catch(() => {
      setNotice(notice, errorMessages.challenge_unavailable, "error");
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!turnstileToken) {
      setNotice(notice, errorMessages.invalid_challenge, "error");
      return;
    }

    const data = new FormData(form);
    const values = {
      idempotencyKey,
      formStartedAt: startedAt,
      turnstileToken,
      companyWebsite: String(data.get("companyWebsite") || ""),
      pageUrl: window.location.href.slice(0, 512),
      firstTouch,
      name: String(data.get("name") || ""),
      interest: String(data.get("interest") || ""),
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      noticeVersion,
      partnerRole: String(data.get("partnerRole") || ""),
      weeklyAvailability: String(data.get("weeklyAvailability") || ""),
      portfolioUrl: String(data.get("portfolioUrl") || ""),
      productName: String(data.get("productName") || ""),
      productUrl: String(data.get("productUrl") || ""),
      productStage: String(data.get("productStage") || ""),
    };

    setNotice(notice, "");
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      const result = await submitApplication(values);
      if (!result.ok) {
        setNotice(notice, errorMessages[result.code] || "Не удалось отправить заявку. Попробуйте ещё раз.", "error");
        return;
      }
      form.hidden = true;
      success.hidden = false;
      idempotencyKey = createIdempotencyKey();
    } catch {
      setNotice(notice, "Нет соединения с сервером. Проверьте интернет и повторите попытку.", "error");
    } finally {
      turnstileToken = "";
      if (window.turnstile && turnstileWidgetId !== undefined) {
        window.turnstile.reset(turnstileWidgetId);
      }
      submitButton.removeAttribute("aria-busy");
      submitButton.disabled = true;
    }
  });
}

if (main) {
  const observer = new MutationObserver(() => {
    const root = main.querySelector("[data-intake-root]");
    if (root) initializeIntake(root);
  });
  observer.observe(main, { childList: true, subtree: true });
  const current = main.querySelector("[data-intake-root]");
  if (current) initializeIntake(current);
}
