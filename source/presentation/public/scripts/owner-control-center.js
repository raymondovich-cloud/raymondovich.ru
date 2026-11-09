const icons = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  partners: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19c.5-3 2.3-4.5 5.2-4.5s4.7 1.5 5.2 4.5M14 15c3.7-.9 6.2.5 7.2 3.5"/></svg>',
  finance: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"/><path d="M3 8h18M16 13h5"/><circle cx="16" cy="13" r=".7"/></svg>',
  ideas: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M8.2 14.5a7 7 0 1 1 7.6 0c-.9.6-1.3 1.4-1.3 2.5h-5c0-1.1-.4-1.9-1.3-2.5Z"/><path d="M12 6v3M6.5 11H8M16 11h1.5"/></svg>',
  ai: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.2 2.2M15.8 15.8 18 18M18 6l-2.2 2.2M8.2 15.8 6 18"/><circle cx="12" cy="12" r="4.5"/><path d="m10.5 12 1 1 2-2"/></svg>',
  telegramBot: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Z"/><path d="m9.9 13.1 4.4-4.4"/></svg>',
  community: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 10h8M8 13.5h5"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.5 2.5-5.2 6-5.2s5.5 1.7 6 5.2M16 5.5a3 3 0 0 1 0 5.8M17 15c2.4.4 3.7 2 4 5"/></svg>',
  security: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v5.5c0 4.5-3.2 7.7-8 9.5-4.8-1.8-8-5-8-9.5V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
  logs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h13M7 10h13M7 16h13M3.5 4h.01M3.5 10h.01M3.5 16h.01M7 21h13"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-1.4 2.4-1.5-.6a7.8 7.8 0 0 1-1.7 1l-.3 1.6h-2.8l-.3-1.6a7.8 7.8 0 0 1-1.7-1l-1.5.6-1.4-2.4 1.2-1a7.2 7.2 0 0 1 0-2l-1.2-1 1.4-2.4 1.5.6a7.8 7.8 0 0 1 1.7-1l.3-1.6h2.8l.3 1.6a7.8 7.8 0 0 1 1.7 1l1.5-.6 1.4 2.4-1.2 1a7.2 7.2 0 0 1 0 2Z"/></svg>'
};

const groups = [
  {
    id: "business",
    title: "БИЗНЕС",
    sections: [
      { id: "projects", icon: "projects", title: "Проекты", description: "Рабочие пространства проектов", status: "active", route: "#authorization/projects", module: "projects" },
      { id: "partners", icon: "partners", title: "Партнёры", description: "Программа партнёров", status: "planned" },
      { id: "finance", icon: "finance", title: "Финансы", description: "Выплаты и доходы", status: "planned" },
      { id: "ideas", icon: "ideas", title: "Идеи", description: "Задумки и предложения", status: "active", route: "#authorization/ideas", module: "ideas" }
    ]
  },
  {
    id: "integrations",
    title: "ИНТЕГРАЦИИ",
    sections: [
      { id: "ai", icon: "ai", title: "ИИ", description: "Подключение ИИ-сервисов", status: "planned" },
      { id: "telegram-bot", icon: "telegramBot", title: "Telegram-бот", description: "Автоматизация и уведомления", status: "planned" },
      { id: "telegram-community", icon: "community", title: "Сообщество в Telegram", description: "Связь с участниками", status: "planned" }
    ]
  },
  {
    id: "system",
    title: "СИСТЕМА",
    sections: [
      { id: "users", icon: "users", title: "Пользователи", description: "Аккаунты и доступы", status: "planned" },
      { id: "security", icon: "security", title: "Безопасность", description: "Защита и контроль доступа", status: "planned" },
      { id: "logs", icon: "logs", title: "Системные журналы", description: "История событий и действий", status: "planned" },
      { id: "settings", icon: "settings", title: "Настройки", description: "Параметры платформы", status: "planned" }
    ]
  }
];

function renderSection(section) {
  const active = section.status === "active";
  const attributes = active
    ? `href="${section.route}" data-owner-module="${section.module}"`
    : 'href="#" aria-disabled="true" tabindex="-1" data-coming-soon="true"';

  return `
    <a class="owner-console-card ${active ? "is-active" : "is-planned"}" ${attributes}>
      <span class="owner-console-card-top">
        <span class="owner-console-icon">${icons[section.icon]}</span>
        <span class="owner-console-card-status">${active ? "ОТКРЫТЬ ↗" : "В РАЗРАБОТКЕ"}</span>
      </span>
      <span class="owner-console-card-content">
        <span class="owner-console-card-title">${section.title}</span>
        <span class="owner-console-card-description">${section.description}</span>
      </span>
    </a>`;
}

document.addEventListener("toggle", (event) => {
  const openedGroup = event.target;
  if (!(openedGroup instanceof HTMLDetailsElement)) return;
  if (!openedGroup.matches(".owner-console-group") || !openedGroup.open) return;
  document.querySelectorAll(".owner-console-group[open]").forEach((group) => {
    if (group !== openedGroup) group.open = false;
  });
}, true);

export function renderOwnerControlCenter(user) {
  return `
    <div class="owner-console-shell">
      <section class="owner-console" aria-label="Панель управления владельца">
        <header class="owner-console-header">
          <div class="owner-console-brand">
            <span class="owner-console-brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </span>
            <h1 class="owner-console-page-title">
              <span class="owner-console-wordmark">RAYMONDOVICH</span>
              <span class="owner-console-brand-divider" aria-hidden="true"> / </span>
              <span class="owner-console-product-name">CONTROL CENTER</span>
            </h1>
          </div>
          <span class="owner-console-access"><span aria-hidden="true"></span><span class="owner-console-access-label">ДОСТУП ВЛАДЕЛЬЦА</span></span>
        </header>

        <div class="owner-console-groups">
          ${groups.map((group, index) => `
            <details class="owner-console-group ws-group" name="owner-hub-group" ${index === 0 ? "open" : ""}>
              <summary>
                <h2>
                  <span class="owner-console-group-icon">${icons[group.id === "business" ? "projects" : group.id === "integrations" ? "ai" : "security"]}</span>
                  <span class="owner-console-group-title">${group.title}</span>
                  <span class="owner-console-group-count">${String(group.sections.length).padStart(2, "0")}</span>
                  <svg class="ws-group-chevron owner-console-group-chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </h2>
              </summary>
              <nav class="ws-group-content owner-console-grid owner-console-grid-${group.id}" aria-label="Разделы: ${group.title.toLowerCase()}">
                ${group.sections.map(renderSection).join("")}
              </nav>
            </details>`).join("")}
        </div>
      </section>
    </div>`;
}
