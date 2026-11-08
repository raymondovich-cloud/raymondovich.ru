const sections = [
  { code: "01", icon: "⌂", title: "Обзор", description: "Состояние экосистемы и ключевые показатели", status: "active", href: "#control-center" },
  { code: "02", icon: "◇", title: "Проекты", description: "Собственные, партнёрские и сторонние проекты", status: "active", href: "/#ecosystem-projects" },
  { code: "03", icon: "◎", title: "Пользователи", description: "Аккаунты, роли и разрешения", status: "planned" },
  { code: "04", icon: "↗", title: "Партнёры", description: "Партнёрские профили и взаимодействие", status: "planned" },
  { code: "05", icon: "₽", title: "Финансы", description: "Доходы, расходы и финансовые операции", status: "planned" },
  { code: "06", icon: "▥", title: "Аналитика", description: "Статистика платформы и проектов", status: "planned" },
  { code: "07", icon: "⌘", title: "Инфраструктура", description: "Домены, сервисы, серверы и подписки", status: "planned" },
  { code: "08", icon: "◇", title: "Безопасность", description: "Доступы, защита и контроль сессий", status: "planned" },
  { code: "09", icon: "≡", title: "Системные журналы", description: "История действий и системных событий", status: "planned" },
  { code: "10", icon: "▦", title: "Design System", description: "Компоненты, токены и правила интерфейса", status: "planned" },
  { code: "11", icon: "⚙", title: "Настройки", description: "Конфигурация и параметры платформы", status: "planned" }
];

export function renderOwnerControlCenter(user) {
  const email = escapeHtml(user.email || "Владелец");
  return `
    <section class="owner-console" aria-labelledby="owner-console-title">
      <header class="owner-console-heading">
        <div>
          <p class="overline">RAYMONDOVICH / OWNER CONTROL CENTER</p>
          <h1 id="owner-console-title">Центр управления</h1>
          <p>Единая административная точка управления цифровой экосистемой.</p>
        </div>
        <div class="owner-console-identity">
          <span class="owner-console-status"><i></i> OWNER ACCESS</span>
          <strong>${email}</strong>
        </div>
      </header>
      <div class="owner-console-section-heading">
        <div><span>CONTROL PANEL</span><h2>Управление экосистемой</h2></div>
        <span class="owner-console-version">OWNER / 01</span>
      </div>
      <nav class="owner-console-grid" aria-label="Разделы панели управления">
        ${sections.map((section) => `
          <a class="owner-console-card ${section.status === "planned" ? "is-planned" : ""}" href="${section.href}" ${section.status === "planned" ? 'aria-disabled="true" data-coming-soon="true"' : ""}>
            <span class="owner-console-card-top"><span class="owner-console-code">${section.code}</span><span class="owner-console-icon" aria-hidden="true">${section.icon}</span></span>
            <span class="owner-console-card-title">${section.title}</span>
            <span class="owner-console-card-description">${section.description}</span>
            <span class="owner-console-card-status">${section.status === "active" ? "ОТКРЫТЬ РАЗДЕЛ ↗" : "В РАЗРАБОТКЕ"}</span>
          </a>`).join("")}
      </nav>
      <footer class="owner-console-footer">
        <span>ДОСТУП ВЛАДЕЛЬЦА · ЗАЩИЩЁННАЯ СЕССИЯ</span>
        <button class="auth-text-button" type="button" data-auth-signout>Выйти из аккаунта</button>
      </footer>
    </section>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
