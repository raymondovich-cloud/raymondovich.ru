import { getTelegramLaunch, getPlatform } from "/source/platform/bridge.js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "/source/config/app-config.js";

const main = document.querySelector("#main");

function uuid() {
  return crypto.randomUUID();
}
function showNotice(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.hidden = !message;
  element.dataset.type = error ? "error" : "info";
}

function initialize(root) {
  if (root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";
  const form = root.querySelector("[data-intake-test-form]");
  const access = root.querySelector("[data-test-access]");
  const accessTitle = root.querySelector("[data-test-access-title]");
  const accessMessage = root.querySelector("[data-test-access-message]");
  const notice = root.querySelector("[data-test-notice]");
  const success = root.querySelector("[data-test-success]");
  const result = root.querySelector("[data-test-result]");
  if (!form) return;

  const launch = getTelegramLaunch();
  if (getPlatform() !== "telegram" || !launch.initData || launch.startParam !== "apply-test") {
    access.hidden = false;
    accessTitle.textContent = "Откройте тест из Telegram";
    accessMessage.textContent = "Нужен запуск через специальную ссылку Raymondovich Mini App. Обычный браузер не имеет подтверждённой Telegram-сессии.";
    return;
  }

  access.hidden = true;
  form.hidden = false;

  const interestInputs = form.querySelectorAll('input[name="interest"]');
  const groups = form.querySelectorAll("[data-test-fields]");
  const updateFields = () => {
    const selected = form.querySelector('input[name="interest"]:checked')?.value;
    groups.forEach((group) => {
      const active = group.dataset.testFields === selected;
      group.hidden = !active;
      group.querySelectorAll("input,select,textarea").forEach((control) => { control.disabled = !active; });
    });
  };
  interestInputs.forEach((input) => input.addEventListener("change", updateFields));
  updateFields();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const values = {
      initData: launch.initData,
      idempotencyKey: uuid(),
      clientPlatform: launch.clientPlatform,
      name: String(data.get("name") || ""),
      interest: String(data.get("interest") || ""),
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      partnerRole: String(data.get("partnerRole") || ""),
      weeklyAvailability: String(data.get("weeklyAvailability") || ""),
      portfolioUrl: String(data.get("portfolioUrl") || ""),
      productName: String(data.get("productName") || ""),
      productUrl: String(data.get("productUrl") || ""),
      productStage: String(data.get("productStage") || ""),
    };
    const button = form.querySelector('button[type="submit"]');
    showNotice(notice, "");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/intake-test-submit`, {
        method: "POST",
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        const messages = {
          not_allowlisted: "У этого Telegram-аккаунта нет доступа к тесту.",
          invalid_test_launch: "Откройте форму по специальной тестовой ссылке из Telegram.",
          test_mode_not_configured: "Тестовый сервер ещё не настроен. Сообщите владельцу.",
          rate_limited: "Лимит тестовых отправок: одна заявка за 10 минут.",
          expired_init_data: "Telegram-сессия устарела. Закройте Mini App и откройте ссылку заново.",
        };
        showNotice(notice, messages[payload.error] || "Не удалось отправить тестовую заявку. Повторите попытку.", true);
        return;
      }
      form.hidden = true;
      success.hidden = false;
      result.textContent = payload.duplicate
        ? "Эта заявка уже была сохранена ранее. Повторное уведомление не отправлялось."
        : payload.notification === "sent"
          ? `Заявка сохранена (ID: ${payload.applicationId}). Telegram-уведомление отправлено.`
          : `Заявка сохранена (ID: ${payload.applicationId}), но доставка уведомления не подтверждена.`;
    } catch {
      showNotice(notice, "Нет соединения с сервером. Проверьте интернет и повторите попытку.", true);
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
}

if (main) {
  const observer = new MutationObserver(() => {
    const root = main.querySelector("[data-intake-test-root]");
    if (root) initialize(root);
  });
  observer.observe(main, { childList: true, subtree: true });
  const current = main.querySelector("[data-intake-test-root]");
  if (current) initialize(current);
}
