import { getPlatform, getTelegramLaunch } from "/source/platform/bridge.js";
import { submitApplication } from "/source/application/intake/intake-submit.js";

const main = document.querySelector("#main");

const errorMessages = {
  expired_init_data: "Срок действия данных Telegram истёк. Закройте Mini App и откройте его заново.",
  invalid_init_data: "Не удалось подтвердить запуск из Telegram. Откройте Mini App через официальную ссылку.",
  rate_limited: "Вы отправляли заявку недавно. Подождите и попробуйте позже.",
  intake_disabled: "Форма временно недоступна. Попробуйте позже.",
  invalid_name: "Проверьте имя: не более 80 символов.",
  invalid_message: "Проверьте сообщение: от 1 до 1000 символов.",
  invalid_partner_role: "Выберите вашу роль в проекте.",
  invalid_weekly_availability: "Выберите время, которое готовы уделять проекту.",
  invalid_portfolio_url: "Укажите корректную ссылку на портфолио с HTTPS.",
  invalid_product_name: "Название продукта должно быть не длиннее 120 символов.",
  invalid_product_url: "Укажите корректную ссылку на продукт с HTTPS.",
  invalid_product_stage: "Выберите стадию продукта.",
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

function initializeIntake(root) {
  if (root.dataset.intakeInitialized === "true") return;
  root.dataset.intakeInitialized = "true";

  const gate = root.querySelector("[data-intake-gate]");
  const legalBlock = root.querySelector("[data-intake-legal-block]");
  const form = root.querySelector("[data-intake-form]");
  const success = root.querySelector("[data-intake-success]");
  const notice = root.querySelector("[data-intake-notice]");
  const counter = root.querySelector("[data-intake-counter]");
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !gate || !success || !submitButton) return;

  const launch = getTelegramLaunch();
  const available = getPlatform() === "telegram" && Boolean(launch.initData);
  if (!available) {
    gate.hidden = false;
    legalBlock && (legalBlock.hidden = true);
    form.hidden = true;
    return;
  }

  gate.hidden = true;
  if (root.dataset.legalNoticeReady !== "true") {
    legalBlock && (legalBlock.hidden = false);
    form.hidden = true;
    return;
  }

  legalBlock && (legalBlock.hidden = true);
  form.hidden = false;
  const nameInput = form.elements.namedItem("name");
  if (nameInput && launch.displayName) nameInput.value = launch.displayName.slice(0, 80);

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

  let idempotencyKey = createIdempotencyKey();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const values = {
      initData: launch.initData,
      startParam: launch.startParam,
      idempotencyKey,
      name: String(data.get("name") || ""),
      interest: String(data.get("interest") || ""),
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      clientPlatform: launch.clientPlatform,
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
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
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
