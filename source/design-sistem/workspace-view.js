/* Version: 2.4.0 */
/* Updated: 2026-11-16 */
const sections = [
 { id: "projects", label: "Проекты" },
 { id: "ideas", label: "Идеи" },
 { id: "team", label: "Команда" },
 { id: "tools", label: "Инструменты" },
 { id: "profile", label: "Профиль" }
];
function workspaceNavigationMarkup(active) {
 const icons = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18"></path></svg>',
  ideas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.8.6 1 1.1 1 2.3h6c0-1.2.2-1.7 1-2.3A7 7 0 0 0 12 2Z"></path></svg>',
  team: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Zm13-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1h-3"></path></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4 4M4 20l4-1 11-11a2.8 2.8 0 0 0-4-4L4 15l-1 4 1 1Z"></path></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>'
 };
 return '<nav class="workspace-mobile-nav" aria-label="Основная навигация">' +
  sections.map(({id,label}) => '<a class="workspace-nav-link" href="#' + id + '"' +
   (active === id ? ' aria-current="page"' : '') +
   '><span class="workspace-nav-icon">' + icons[id] + '</span><span>' + label + '</span></a>'
  ).join("") + '</nav>';
}
function escapeHtml(value) {
 return String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
 }[character]));
}
function initials(fullName, username) {
 const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
 if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
 if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
 return String(username || "R").slice(0, 2).toUpperCase();
}
function profileMarkup(user, profileData) {
 const metadata = user?.user_metadata || {};
 const appMetadata = user?.app_metadata || {};
 const profile = profileData?.profile || profileData || {};
 const accountStatus = appMetadata.raymondovich_role === "owner" ? "Владелец" : "Пользователь";
 const fullName = profile.full_name || metadata.full_name || metadata.name || "Имя не указано";
 const username = profile.username || metadata.username || "";
 const avatar = initials(fullName, username);
 return '<div class="profile-page">' +
  '<section class="profile-identity-card" aria-label="Карточка пользователя"><div class="profile-avatar" aria-hidden="true">' + escapeHtml(avatar) + '</div><div class="profile-identity-copy"><h2>' + escapeHtml(fullName) + '</h2>' +
  (username ? '<p class="profile-username">@' + escapeHtml(username) + '</p>' : '<p class="profile-username">Логин не указан</p>') +
  '<span class="profile-status"><span class="profile-status-dot"></span>' + escapeHtml(accountStatus) + '</span></div></section>' +
  '<div class="profile-sections">' +
  (appMetadata.raymondovich_role === "owner" ? '<section class="profile-group profile-control-card"><div class="profile-control-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15V9m4 6V5m4 10v-4m4 4V7"></path></svg></div><div class="profile-row-copy"><h2>Центр управления</h2><p>Управление экосистемой Raymondovich.</p></div><span class="profile-access-label">Владелец</span></section>' : '') +
  '<a class="profile-group profile-link-card" href="#profile/active-projects"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18"></path></svg></span><span class="profile-row-copy"><strong>Действующие проекты</strong><small>Проекты, которые уже запущены и приносят доход.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '<a class="profile-group profile-link-card" href="#profile/ecosystem-tools"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m14.7 6.3 3 3M4 20l4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"></path></svg></span><span class="profile-row-copy"><strong>Инструменты экосистемы</strong><small>Полный каталог инструментов экосистемы — независимо от ваших прав доступа.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '<section class="profile-group profile-static-card"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21H3Z"></path><path d="M9 21v-7h6v7"></path></svg></span><span class="profile-row-copy"><strong>Витрина проектов</strong><small>Знакомство с проектами экосистемы.</small></span><span class="profile-soon-label">Скоро</span></section>' +
  '<section class="profile-group profile-static-card"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"></path></svg></span><span class="profile-row-copy"><strong>Избранное</strong><small>Сохранённые проекты и материалы.</small></span><span class="profile-soon-label">Скоро</span></section>' +
  '<a class="profile-group profile-link-card" href="#profile/settings"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"></circle><path d="M19.4 15a1.8 1.8 0 0 0 .9 2.1l.1.1-2.5 2.5-.1-.1a1.8 1.8 0 0 0-2.1-.9 1.8 1.8 0 0 0-1.2 1.7v.2h-3.6v-.2a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2.1.9l-.1.1L5 17.2l.1-.1A1.8 1.8 0 0 0 6 15a1.8 1.8 0 0 0-1.7-1.2h-.2v-3.6h.2A1.8 1.8 0 0 0 6 9a1.8 1.8 0 0 0-.9-2.1L5 6.8l2.5-2.5.1.1a1.8 1.8 0 0 0 2.1.9A1.8 1.8 0 0 0 11 3.6v-.2h3.6v.2a1.8 1.8 0 0 0 1.2 1.7 1.8 1.8 0 0 0 2.1-.9l.1-.1 2.5 2.5-.1.1a1.8 1.8 0 0 0-.9 2.1 1.8 1.8 0 0 0 1.7 1.2h.2v3.6h-.2a1.8 1.8 0 0 0-1.8 1.2Z"></path></svg></span><span class="profile-row-copy"><strong>Настройки</strong><small>Данные профиля, оформление и аккаунт.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '</div>';
}
function settingsMarkup(user, profileData, route) {
 const profile = profileData?.profile || profileData || {};
 const metadata = user?.user_metadata || {};
 const fullName = profile.full_name || metadata.full_name || metadata.name || "";
 const birthDate = profile.birth_date || metadata.birth_date || "";
 const email = profileData?.email || user?.email || "";
 let preference = "system";
 try { preference = window.localStorage.getItem("raymondovich-theme") || "system"; } catch {}
 const labels = { system: "Как на устройстве", light: "Светлая", dark: "Тёмная" };
 const groups = [
  ["personal-data","Личные данные","ФИО и дата рождения"],
  ["privacy","Конфиденциальность","Электронная почта и пароль"],
  ["appearance","Оформление","Тема интерфейса и иконки"],
  ["cryptography","Криптография","Управление криптографическими ключами"]
 ];
 const groupRoute = route.split("/")[2] || "";
 if (!groupRoute) return '<div class="settings-group-list">' + groups.map(([id,name,description]) =>
  '<a class="settings-group-link" href="#profile/settings/' + id + '"><span class="settings-group-symbol" aria-hidden="true">' +
  ({ "personal-data":"◉", privacy:"◇", appearance:"◐", cryptography:"⌘" }[id]) +
  '</span><span class="settings-group-copy"><strong>' + name + '</strong><small>' + description + '</small></span><span class="settings-group-chevron" aria-hidden="true">›</span></a>'
 ).join("") + '</div><button class="profile-signout settings-signout" type="button" data-auth-signout>Выйти из аккаунта</button>';
 if (groupRoute === "personal-data") return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Личные данные</h2><p>Основная информация вашего профиля.</p></div></div>' +
  '<form class="settings-form" data-profile-settings-form><label class="settings-field"><span>ФИО</span><input name="full_name" type="text" autocomplete="name" minlength="3" maxlength="160" required value="' + escapeHtml(fullName) + '"></label>' +
  '<label class="settings-field"><span>Дата рождения</span><input name="birth_date" type="date" autocomplete="bday" required value="' + escapeHtml(birthDate) + '"></label>' +
  '<div class="settings-form-feedback" data-settings-feedback role="status" aria-live="polite"></div><button class="settings-primary-button" type="submit">Сохранить изменения</button></form></section>';
 if (groupRoute === "privacy") return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Конфиденциальность</h2><p>Контактные данные и защита доступа к аккаунту.</p></div></div>' +
  '<div class="settings-security-list"><label class="settings-field"><span>Электронная почта</span><input type="email" value="' + escapeHtml(email) + '" disabled><small>Используется для входа и восстановления доступа.</small></label>' +
  '<div class="settings-security-action"><div><strong>Пароль</strong><p>Для смены пароля отправим ссылку на вашу электронную почту.</p></div><button class="settings-secondary-button" type="button" data-password-reset>Сменить пароль</button></div>' +
  '<div class="settings-form-feedback" data-password-feedback role="status" aria-live="polite"></div></div></section>';
 if (groupRoute === "appearance") return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Оформление</h2><p>Настройте внешний вид интерфейса.</p></div></div><div class="settings-theme-options" role="group" aria-label="Тема оформления">' +
  ["system","light","dark"].map((theme) => '<button type="button" class="settings-theme-option" data-theme-option="' + theme + '" aria-pressed="' + (preference === theme) + '">' + labels[theme] + '</button>').join("") +
  '</div><p class="settings-section-note">Дополнительные варианты оформления и наборы иконок появятся позднее.</p></section>';
 if (groupRoute === "cryptography") return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Криптография</h2><p>Управление криптографическими ключами.</p></div></div>' +
  '<div class="settings-placeholder"><strong>Добавление ключа</strong><p>Раздел подготовки ключей будет реализован отдельно после определения формата и правил безопасного хранения.</p></div></section>';
 return '<div class="workspace-empty-state"><h2>Раздел не найден</h2><p>Выберите группу настроек.</p></div>';
}
export function renderWorkspaceView(container, user, activeSection, profileData) {
 const profileSubroutes = new Set(["profile/active-projects", "profile/ecosystem-tools", "profile/settings", "profile/settings/personal-data", "profile/settings/privacy", "profile/settings/appearance", "profile/settings/cryptography"]);
 const active = profileSubroutes.has(activeSection) ? "profile" : sections.some((section) => section.id === activeSection) ? activeSection : "projects";
 const isActiveProjects = activeSection === "profile/active-projects";
 const isEcosystemTools = activeSection === "profile/ecosystem-tools";
 const isSettings = activeSection.startsWith("profile/settings");
 const settingsTitles = { "profile/settings/personal-data": "Личные данные", "profile/settings/privacy": "Конфиденциальность", "profile/settings/appearance": "Оформление", "profile/settings/cryptography": "Криптография" };
 const title = isActiveProjects ? "Действующие проекты" : isEcosystemTools ? "Инструменты экосистемы" : isSettings ? (settingsTitles[activeSection] || "Настройки") : sections.find((section) => section.id === active).label;
 const isProjects = active === "projects";
 const subrouteContent = isActiveProjects
  ? '<div class="workspace-empty-state"><div class="workspace-empty-inner"><div class="workspace-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M7 15h3l2-4 2 3h3"></path></svg></div><h2>Действующие проекты появятся здесь</h2><p>В этом разделе будут только запущенные проекты, которые уже приносят доход. Проекты в разработке будут доступны через общий раздел «Проекты».</p></div></div>'
  : '<div class="ecosystem-tools-catalog"><p class="workspace-catalog-intro">Полный каталог инструментов экосистемы. Доступность каждого инструмента определяется отдельно и не влияет на его отображение в этом каталоге.</p><div class="workspace-tool-category"><h2>Инструменты разработки</h2><div class="workspace-tool-grid">' +
    ['GitHub','Supabase','Cloudflare','REG.RU','ChatGPT','Claude'].map((name) => '<article class="workspace-tool-card"><span class="workspace-tool-mark" aria-hidden="true">' + escapeHtml(name.slice(0,1)) + '</span><div><h3>' + escapeHtml(name) + '</h3><p>Инструмент экосистемы</p></div><span class="workspace-tool-status">Планируется</span></article>').join('') +
    '</div></div><p class="workspace-catalog-note">Каталог будет расширяться по мере подключения и запуска инструментов Raymondovich.</p></div>';
 const content = isSettings
  ? settingsMarkup(user, profileData, activeSection)
  : isActiveProjects || isEcosystemTools
  ? subrouteContent
  : active === "profile"
   ? profileMarkup(user, profileData)
   : isProjects
    ? '<div class="workspace-empty-state"><div class="workspace-empty-inner"><div class="workspace-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18M8 15h3"></path></svg></div><h2>Проекты будут отображаться здесь</h2><p>Здесь соберутся проекты, в которых вы участвуете: созданные вами и те, к которым вас пригласили.</p></div></div><p class="workspace-section-notice">Подключение списка проектов и управление участием — следующий этап разработки.</p>'
    : '<div class="workspace-empty-state"><div class="workspace-empty-inner"><div class="workspace-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5m0-8h.01"></path></svg></div><h2>Раздел подключим следующим этапом</h2><p>Навигация уже общая для рабочего пространства. Функциональность раздела будет добавлена отдельно.</p></div></div>';
 container.innerHTML = '<div class="workspace-layout">' +
  '<section class="workspace-content" aria-labelledby="workspace-title"><header class="workspace-page-heading"><div><h1 id="workspace-title">' + title + '</h1>' +
  ((active === "profile" && !isActiveProjects && !isEcosystemTools && !isSettings) ? "" : '<p>' +
   (active === "profile" ? (isActiveProjects ? "Запущенные проекты, которые приносят доход." : isEcosystemTools ? "Полный каталог инструментов экосистемы Raymondovich." : isSettings ? (activeSection === "profile/settings" ? "Выберите группу настроек." : "Настройка параметров выбранной группы.") : "") : isProjects ? "Все проекты, в которых вы участвуете, независимо от того, кто их создал." : "Рабочее пространство Raymondovich.") +
   '</p>') +
  '</div></header>' + content + '</section></div>' + workspaceNavigationMarkup(active);
}
