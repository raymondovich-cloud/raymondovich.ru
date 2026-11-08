const groups = [
  {
    id: "main",
    label: "Главное",
    heading: "ГЛАВНОЕ",
    sections: [
      { code: "01", icon: "⌂", title: "Обзор", description: "Сводка по экосистеме", active: true, href: "#control-center" },
      { code: "02", icon: "▥", title: "Аналитика", description: "Метрики и отчёты" }
    ]
  },
  {
    id: "business",
    label: "Бизнес",
    heading: "БИЗНЕС",
    sections: [
      { code: "01", icon: "◇", title: "Проекты", description: "Приложения экосистемы" },
      { code: "02", icon: "◎", title: "Пользователи", description: "Аккаунты и доступы" },
      { code: "03", icon: "↗", title: "Партнёры", description: "Программа партнёров" },
      { code: "04", icon: "₽", title: "Финансы", description: "Выплаты и доходы" },
      { code: "05", icon: "✧", title: "Идеи", description: "Задумки и предложения" }
    ]
  },
  {
    id: "system",
    label: "Система",
    heading: "СИСТЕМА",
    sections: [
      { code: "01", icon: "⌘", title: "Инфраструктура", description: "Домены, сервисы и серверы" },
      { code: "02", icon: "◇", title: "Безопасность", description: "Защита и контроль доступа" },
      { code: "03", icon: "≡", title: "Системные журналы", description: "История событий и действий" },
      { code: "04", icon: "▦", title: "Design System", description: "Компоненты и правила интерфейса" },
      { code: "05", icon: "⚙", title: "Настройки", description: "Параметры платформы" }
    ]
  }
];

export function renderOwnerControlCenter(user) {
  const email = escapeHtml(user.email || "Владелец");
  return `
    <section class="owner-console" aria-labelledby="owner-console-title">
      <header class="owner-console-heading">
        <div>
          <p class="overline">RAYMONDOVICH / CONTROL CENTER</p>
          <h1 id="owner-console-title">Центр управления</h1>
        </div>
        <div class="owner-console-identity">
          <span class="owner-console-status"><i></i> OWNER ACCESS</span>
          <strong>${email}</strong>
        </div>
      </header>

      <div class="owner-console-tabs" role="tablist" aria-label="Категории управления">
        ${groups.map((group, index) => `
          <button class="owner-console-tab" type="button" role="tab"
            id="owner-tab-${group.id}" aria-controls="owner-panel-${group.id}"
            aria-selected="${index === 0}" data-owner-tab="${group.id}">
            ${group.label}
          </button>`).join("")}
      </div>

      ${groups.map((group, index) => `
        <section class="owner-console-panel" role="tabpanel" id="owner-panel-${group.id}"
          aria-labelledby="owner-tab-${group.id}" data-owner-panel="${group.id}" ${index === 0 ? "" : "hidden"}>
          <div class="owner-console-section-heading">
            <span>${group.heading} <i>·</i> ${String(group.sections.length).padStart(2, "0")} РАЗДЕЛОВ</span>
          </div>
          <nav class="owner-console-grid" aria-label="Разделы: ${group.label}">
            ${group.sections.map((section) => `
              <a class="owner-console-card ${section.active ? "is-active" : "is-planned"}"
                href="${section.href || "#"}" ${section.active ? "" : 'aria-disabled="true" data-coming-soon="true"'}>
                <span class="owner-console-code">${section.code}</span>
                <span class="owner-console-card-content">
                  <span class="owner-console-card-title">${section.title}</span>
                  <span class="owner-console-card-description">${section.description}</span>
                </span>
                <span class="owner-console-card-status">${section.active ? "ОТКРЫТЬ ↗" : "В РАЗРАБОТКЕ"}</span>
              </a>`).join("")}
          </nav>
        </section>`).join("")}

      <footer class="owner-console-footer">
        <span>ДОСТУП ВЛАДЕЛЬЦА</span>
        <button class="auth-text-button" type="button" data-auth-signout>Выйти</button>
      </footer>
    </section>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
