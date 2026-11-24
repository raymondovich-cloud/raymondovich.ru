/* Version: 3.45.0 */
/* Updated: 2026-11-24 */
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
  '<span class="profile-status"><span class="profile-status-dot"></span>' + escapeHtml(accountStatus) + '</span></div>' +
  '<button class="profile-telegram-icon-button" type="button" data-telegram-link-start aria-label="Подключить Telegram" title="Подключить Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.9-7.1L3 10.1 21 3Z"></path><path d="m9.9 13.9 5.2-5.2"></path></svg></button><span class="profile-telegram-status" data-telegram-link-status role="status" aria-live="polite"></span><span class="profile-telegram-feedback" data-telegram-link-feedback role="status" aria-live="polite"></span>' + (profile.public_profile_enabled === true ? '<button class="profile-share-icon-button" type="button" data-public-profile-open aria-label="Поделиться публичным профилем" title="Поделиться профилем"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19V12a7 7 0 0 1 7-7h6m-6-4 6 4-6 4"></path></svg></button>' : '') + (appMetadata.raymondovich_role === "owner" ? '<a class="profile-control-icon-button" href="#control-center" aria-label="Центр управления" title="Центр управления"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z"></path><path d="m8.5 12 2.3 2.3 4.8-5"></path></svg></a>' : '') +
  '</section>' +
  (profile.public_profile_enabled === true ? '<dialog class="public-profile-dialog" data-public-profile-dialog aria-labelledby="public-profile-dialog-title"><div class="public-profile-dialog-panel"><div class="settings-card-heading"><div><h2 id="public-profile-dialog-title">Публичная карточка</h2><p>Так профиль увидят другие пользователи.</p></div><button class="public-profile-dialog-close" type="button" data-public-profile-close aria-label="Закрыть">×</button></div><div class="public-profile-preview"><div class="profile-avatar">' + escapeHtml(avatar) + '</div><div><strong>' + escapeHtml(fullName) + '</strong><span>@' + escapeHtml(username) + '</span></div></div><div class="public-profile-preview-socials">' + [["Instagram", profile.instagram_url], ["YouTube", profile.youtube_url], ["Telegram", profile.telegram_url]].filter(([,url]) => typeof url === "string" && url.startsWith("https://")).map(([label,url]) => '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>').join("") + '</div><div class="public-profile-preview-projects">' + (Array.isArray(profile.showcase_projects) && profile.showcase_projects.length ? profile.showcase_projects.map((project) => '<article><strong>' + escapeHtml(project.name) + '</strong><p>' + escapeHtml(project.description || "Описание не добавлено") + '</p></article>').join("") : '<p>Пока нет проектов в публичной карточке.</p>') + '</div><p class="public-profile-share-url">' + escapeHtml(window.location.origin + '/#profile/' + encodeURIComponent(username)) + '</p><p class="settings-form-feedback" data-public-profile-share-feedback role="status" aria-live="polite"></p><div class="public-profile-dialog-actions"><button class="settings-secondary-button" type="button" data-public-profile-close>Закрыть</button><button class="settings-primary-button" type="button" data-public-profile-share data-username="' + escapeHtml(username) + '">Поделиться</button></div></div></dialog>' : '') +
  '<div class="profile-sections">' +

  '<a class="profile-group profile-link-card" href="#profile/active-projects"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18"></path></svg></span><span class="profile-row-copy"><strong>Действующие проекты</strong><small>Проекты, которые уже запущены и приносят доход.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '<a class="profile-group profile-link-card" href="#profile/ecosystem-tools"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m14.7 6.3 3 3M4 20l4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"></path></svg></span><span class="profile-row-copy"><strong>Инструменты экосистемы</strong><small>Полный каталог инструментов экосистемы — независимо от ваших прав доступа.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '<section class="profile-group profile-static-card"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21H3Z"></path><path d="M9 21v-7h6v7"></path></svg></span><span class="profile-row-copy"><strong>Витрина проектов</strong><small>Знакомство с проектами экосистемы.</small></span><span class="profile-soon-label">Скоро</span></section>' +
  '<section class="profile-group profile-static-card"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"></path></svg></span><span class="profile-row-copy"><strong>Избранное</strong><small>Сохранённые проекты и материалы.</small></span><span class="profile-soon-label">Скоро</span></section>' +
  '<a class="profile-group profile-link-card" href="#trash"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path></svg></span><span class="profile-row-copy"><strong>Корзина</strong><small>Архивированные проекты и команды. Восстановление доступно при наличии прав.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a><a class="profile-group profile-link-card" href="#profile/settings"><span class="profile-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"></circle><path d="M19.4 15a1.8 1.8 0 0 0 .9 2.1l.1.1-2.5 2.5-.1-.1a1.8 1.8 0 0 0-2.1-.9 1.8 1.8 0 0 0-1.2 1.7v.2h-3.6v-.2a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2.1.9l-.1.1L5 17.2l.1-.1A1.8 1.8 0 0 0 6 15a1.8 1.8 0 0 0-1.7-1.2h-.2v-3.6h.2A1.8 1.8 0 0 0 6 9a1.8 1.8 0 0 0-.9-2.1L5 6.8l2.5-2.5.1.1a1.8 1.8 0 0 0 2.1.9A1.8 1.8 0 0 0 11 3.6v-.2h3.6v.2a1.8 1.8 0 0 0 1.2 1.7 1.8 1.8 0 0 0 2.1-.9l.1-.1 2.5 2.5-.1.1a1.8 1.8 0 0 0-.9 2.1 1.8 1.8 0 0 0 1.7 1.2h.2v3.6h-.2a1.8 1.8 0 0 0-1.8 1.2Z"></path></svg></span><span class="profile-row-copy"><strong>Настройки</strong><small>Данные профиля, оформление и аккаунт.</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>' +
  '</div>';
}
function settingsMarkup(user, profileData, route, projectState = null) {
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
  ["public-info","Публичная информация","Данные для публичной карточки и портфолио"],
  ["privacy","Конфиденциальность","Электронная почта и пароль"],
  ["appearance","Оформление","Тема интерфейса и иконки"],
  ["cryptography","Криптография","Управление криптографическими ключами"]
 ];
 const groupRoute = route.split("/")[2] || "";
 if (!groupRoute) return '<div class="settings-group-list">' + groups.map(([id,name,description]) =>
  '<a class="settings-group-link" href="#profile/settings/' + id + '"><span class="settings-group-symbol" aria-hidden="true">' +
  ({ "personal-data":"◉", "public-info":"↗", privacy:"◇", appearance:"◐", cryptography:"⌘" }[id]) +
  '</span><span class="settings-group-copy"><strong>' + name + '</strong><small>' + description + '</small></span><span class="settings-group-chevron" aria-hidden="true">›</span></a>'
 ).join("") + '</div><button class="profile-signout settings-signout" type="button" data-auth-signout>Выйти из аккаунта</button>';
 if (groupRoute === "personal-data") return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Личные данные</h2><p>Основная информация вашего профиля.</p></div></div>' +
  '<form class="settings-form" data-profile-settings-form><label class="settings-field"><span>ФИО</span><input name="full_name" type="text" autocomplete="name" minlength="3" maxlength="160" required value="' + escapeHtml(fullName) + '"></label>' +
  '<label class="settings-field"><span>Дата рождения</span><input name="birth_date" type="date" autocomplete="bday" required value="' + escapeHtml(birthDate) + '"></label>' +
  '<div class="settings-form-feedback" data-settings-feedback role="status" aria-live="polite"></div><button class="settings-primary-button" type="submit">Сохранить изменения</button></form></section>';
 if (groupRoute === "public-info") {
  const username = profile.username || metadata.username || "";
  const selectedIds = new Set((Array.isArray(profile.showcase_projects) ? profile.showcase_projects : []).map((project) => String(project.id)));
  const ownedProjects = projectState?.status === "ready" && Array.isArray(projectState.projects) ? projectState.projects : [];
  const projectOptions = ownedProjects.length
   ? ownedProjects.map((project) => '<label class="public-project-option"><input type="checkbox" name="showcase_project_ids" value="' + escapeHtml(project.id) + '"' + (selectedIds.has(String(project.id)) ? ' checked' : '') + '><span><strong>' + escapeHtml(project.name) + '</strong><small>' + escapeHtml(project.description || "Описание не добавлено") + '</small></span></label>').join("")
   : '<p class="settings-section-note">Пока нет собственных активных проектов для портфолио.</p>';
  return '<section class="settings-card"><div class="settings-card-heading"><div><h2>Публичная информация</h2><p>Выберите, что увидят посетители вашей публичной карточки.</p></div></div>' +
   '<form class="settings-form" data-public-profile-form>' +
   '<label class="settings-field"><span>ФИО</span><input type="text" value="' + escapeHtml(fullName) + '" disabled><small>Изменяется в разделе «Личные данные».</small></label>' +
   '<label class="settings-field"><span>Логин в экосистеме</span><input type="text" value="' + escapeHtml(username ? "@" + username : "Логин не указан") + '" disabled></label>' +
   '<label class="settings-field"><span>О себе</span><textarea name="about" rows="3" maxlength="80" placeholder="Коротко расскажите о себе — до 80 символов">' + escapeHtml(profile.about || "") + '</textarea><small>Не более 80 символов.</small></label>' +
   '<label class="settings-field"><span>Instagram</span><input name="instagram_url" type="url" inputmode="url" placeholder="https://instagram.com/username" value="' + escapeHtml(profile.instagram_url || "") + '"></label>' +
   '<label class="settings-field"><span>YouTube</span><input name="youtube_url" type="url" inputmode="url" placeholder="https://youtube.com/@channel" value="' + escapeHtml(profile.youtube_url || "") + '"></label>' +
   '<label class="settings-field"><span>Telegram</span><input name="telegram_url" type="url" inputmode="url" placeholder="https://t.me/username" value="' + escapeHtml(profile.telegram_url || "") + '"></label>' +
   '<div class="public-projects-picker"><div class="public-projects-heading"><strong>Проекты в публичной карточке</strong><small>Отметьте только собственные проекты, которые хотите показать. Внутренний доступ к ним не открывается.</small></div>' + projectOptions + '</div>' +
   '<label class="public-profile-switch"><input type="checkbox" name="public_profile_enabled"' + (profile.public_profile_enabled === true ? ' checked' : '') + '><span><strong>Публичный профиль включён</strong><small>Если выключить, карточка станет недоступна по публичной ссылке.</small></span></label>' +
   '<div class="settings-form-feedback" data-public-profile-feedback role="status" aria-live="polite"></div><button class="settings-primary-button" type="submit">Сохранить публичную информацию</button></form></section>';
 }
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
function formatProjectDate(value) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "";
 return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function projectsOverviewMarkup(state) {
 const toolbar = '<div class="projects-overview-intro"><div class="projects-toolbar-heading"><span class="projects-eyebrow">ПРОЕКТНОЕ ПРОСТРАНСТВО</span><h2>Ваши проекты</h2></div><a class="project-primary-button projects-create-button" href="#projects/create" aria-label="Создать проект" title="Создать проект"><span aria-hidden="true">+</span></a></div>';
 if (!state || state.status === "loading") {
  return '<section class="projects-overview">' + toolbar + '<div class="projects-loading-state" role="status"><span class="projects-loading-indicator" aria-hidden="true"></span><p>Загружаем ваши проекты…</p></div></section>';
 }
 if (state.status === "error") {
  return '<section class="projects-overview">' + toolbar + '<div class="projects-empty-state projects-error-state"><h3>Не удалось загрузить проекты</h3><p>' + escapeHtml(state.message || "Проверьте подключение и попробуйте ещё раз.") + '</p><button class="project-secondary-button" type="button" data-project-retry>Повторить загрузку</button></div></section>';
 }
 const projects = Array.isArray(state.projects) ? state.projects : [];
 if (!projects.length) {
  return '<section class="projects-overview">' + toolbar + '<div class="projects-empty-state"><div class="projects-empty-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18M8 15h3"></path></svg></div><h3>Пока нет проектов</h3><p>Создайте первый проект, чтобы организовать работу, подключить инструменты и при необходимости пригласить участников.</p><a class="projects-empty-action" href="#projects/create">Создать первый проект <span aria-hidden="true">→</span></a></div></section>';
 }
 const componentLabels = { website: "Сайт", telegram_bot: "Telegram-бот", telegram_mini_app: "Telegram Mini App", ios_app: "iOS-приложение" };
 const cards = projects.map((project) => {
  const components = Array.isArray(project.components) ? project.components : [];
  const componentMarkup = components.length
   ? '<div class="project-card-components">' + components.map((component) => '<span>' + escapeHtml(componentLabels[component.code] || component.name || component.code) + '</span>').join("") + '</div>'
   : "";
  const description = project.description
   ? '<p class="project-card-description">' + escapeHtml(project.description) + '</p>'
   : '<p class="project-card-description project-card-description-muted">Описание не добавлено</p>';
  const date = formatProjectDate(project.created_at);
  return '<a class="project-card project-card-link" href="#projects/' + encodeURIComponent(project.id) + '" aria-label="Открыть проект: ' + escapeHtml(project.name) + '"><div class="project-card-meta"><span class="project-card-type">' + (project.project_type === "offline" ? "Офлайн-проект" : "Онлайн-проект") + '</span><span class="project-card-role">' + (project.role === "owner" ? "Владелец" : "Участник") + '</span></div><h3>' + escapeHtml(project.name) + '</h3>' + description + componentMarkup + '<div class="project-card-footer">' + (project.parent_project_id ? '<span>Подпроект</span>' : '<span>Основной проект</span>') + (date ? '<time datetime="' + escapeHtml(project.created_at) + '">Создан ' + escapeHtml(date) + '</time>' : '') + '</div></a>';
 }).join("");
 return '<section class="projects-overview">' + toolbar + '<div class="project-card-grid">' + cards + '</div></section>';
}

function projectDetailMarkup(state, isProjectInformation = false, isProjectSettings = false) {
 if (!state || state.status === "loading") return '<section class="project-detail"><p role="status">Загружаем проект…</p></section>';
 if (state.status === "error") return '<section class="project-detail"><h2>Не удалось открыть проект</h2><p>' + escapeHtml(state.message || "Попробуйте открыть проект ещё раз.") + '</p></section>';
 const project = state.project;
 if (!project) return '<section class="project-detail"><h2>Проект не найден</h2><p>Возможно, проект удалён или у вас нет доступа к нему.</p></section>';
 const componentLabels = { website: "Сайт", telegram_bot: "Telegram-бот", telegram_mini_app: "Telegram Mini App", ios_app: "iOS-приложение" };
 const components = Array.isArray(project.components) ? project.components : [];
 const informationCard = '<div class="project-detail-card project-info-card"><h3>Общая информация</h3><dl><div><dt>Тип проекта</dt><dd>' + (project.project_type === "offline" ? "Офлайн-проект" : "Онлайн-проект") + '</dd></div><div><dt>Статус</dt><dd>' + escapeHtml(project.status || "Активен") + '</dd></div><div><dt>Описание</dt><dd>' + (project.description ? escapeHtml(project.description) : "Описание не добавлено") + '</dd></div><div><dt>Создан</dt><dd>' + escapeHtml(formatProjectDate(project.created_at) || "—") + '</dd></div><div><dt>ID проекта</dt><dd><code>' + escapeHtml(project.id) + '</code></dd></div></dl></div>';
 if (isProjectInformation) return '<section class="project-detail project-information-page"><div class="project-detail-topline"><span class="projects-eyebrow">ПРОЕКТНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + (project.role === "owner" ? "Владелец" : "Участник") + '</span></div><div class="project-detail-heading"><h2>' + escapeHtml(project.name) + '</h2></div>' + informationCard + '<a class="project-detail-card project-settings-card project-settings-link" href="#projects/' + encodeURIComponent(project.id) + '/settings"><span><h3>Настройки проекта</h3><p>Параметры и управление проектом.</p></span><span class="profile-chevron" aria-hidden="true">›</span></a></section>';
 if (isProjectSettings) return '<section class="project-detail project-information-page project-settings-page"><div class="project-detail-topline"><span class="projects-eyebrow">ПРОЕКТНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + (project.role === "owner" ? "Владелец" : "Участник") + '</span></div><div class="project-detail-heading"><h2>Настройки проекта</h2><p>' + escapeHtml(project.name) + '</p></div><section class="project-detail-card project-settings-card">' + ((project.role === "owner" ? '<div class="project-danger-zone"><div><h3>Удаление проекта</h3><p>Проект и все его подпроекты, участники и связанные настройки будут удалены без возможности восстановления.</p></div><button class="project-danger-button" type="button" data-project-delete-open>Удалить проект</button></div><dialog class="project-delete-dialog" data-project-delete-dialog><div class="project-delete-dialog-panel"><div class="project-member-dialog-heading"><div><h2>Удалить проект?</h2><p>Будет окончательно удалён проект «' + escapeHtml(project.name) + '» и все его подпроекты. Это действие нельзя отменить.</p></div><button class="project-member-dialog-close" type="button" data-project-delete-close aria-label="Закрыть">×</button></div><form class="project-delete-form" data-project-delete-form><label class="project-form-field"><span>Пароль от аккаунта Raymondovich</span><input name="password" type="password" autocomplete="current-password" required minlength="1"></label><p class="project-form-feedback" data-project-delete-feedback role="status" aria-live="polite"></p><div class="project-member-dialog-actions"><button class="project-secondary-button" type="button" data-project-delete-close>Отмена</button><button class="project-danger-button" type="submit">Подтвердить удаление</button></div></form></div></dialog>' : '')) + '</section></section>';
 return '<section class="project-detail"><div class="project-detail-topline"><span class="projects-eyebrow">ПРОЕКТНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + (project.role === "owner" ? "Владелец" : "Участник") + '</span></div><div class="project-detail-heading"><h2>' + escapeHtml(project.name) + '</h2>' +
  '<a class="project-info-avatar" href="#projects/' + encodeURIComponent(project.id) + '/information" aria-label="Открыть общую информацию проекта" title="Общая информация проекта">' + escapeHtml(initials(project.name, "PR")) + '</a></div>' +
  (components.length ? '<div class="project-detail-card"><h3>Компоненты проекта</h3><div class="project-card-components">' + components.map((item) => '<span>' + escapeHtml(componentLabels[item.code] || item.name || item.code) + '</span>').join("") + '</div></div>' : '') +
  projectMembersMarkup(state) +
  (project.parent_project_id ? '<div class="project-detail-card"><h3>Структура</h3><p>Этот проект является подпроектом.</p></div>' : '') +
  '</section>';
}

function projectMembersMarkup(state) {
 const data = state?.membersData;
 if (!data) return '<section class="project-detail-card"><h3>Участники проекта</h3><p class="project-members-muted">Загружаем список участников…</p></section>';
 if (data.status === "error") return '<section class="project-detail-card"><h3>Участники проекта</h3><p class="project-members-error">' + escapeHtml(data.message || "Не удалось загрузить участников.") + '</p><button class="project-secondary-button" type="button" data-project-members-retry>Повторить</button></section>';
 const members = Array.isArray(data.members) ? data.members : [];
 const roles = Array.isArray(data.roles) ? data.roles : [];
 const roleLabels = { administrator: "Администратор", manager: "Менеджер", member: "Участник", leader: "Руководитель", developer: "Разработчик", observer: "Наблюдатель" };
 const roleName = (role) => roleLabels[role.code] || role.name || "Участник";
 const roleOptions = roles.map((role) => '<option value="' + escapeHtml(role.id) + '">' + escapeHtml(roleName(role)) + '</option>').join("");
 const memberRows = members.length ? members.map((member) => {
  const name = member.full_name || (member.username ? '@' + member.username : 'Пользователь');
  return '<div class="project-member-row"><span class="project-member-avatar" aria-hidden="true">' + escapeHtml(initials(name, member.username)) + '</span><span class="project-member-copy"><strong>' + escapeHtml(name) + '</strong><small>' + (member.username ? '@' + escapeHtml(member.username) : 'Логин не указан') + '</small></span><span class="project-member-role">' + escapeHtml(roleLabels[member.role_code] || member.role_name || 'Участник') + '</span></div>';
 }).join("") : '<p class="project-members-muted">Пока никто не добавлен.</p>';
 const inviteDialog = data.can_invite ? '<button class="project-member-add-button" type="button" data-project-member-open aria-label="Добавить участника" title="Добавить участника">+</button><dialog class="project-member-dialog" data-project-member-dialog aria-labelledby="project-member-dialog-title"><div class="project-member-dialog-panel"><div class="project-member-dialog-heading"><div><h2 id="project-member-dialog-title">Добавить участника</h2><p>Укажите логин пользователя и его роль в проекте.</p></div><button class="project-member-dialog-close" type="button" data-project-member-close aria-label="Закрыть окно">×</button></div><form class="project-member-invite-form" data-project-member-form><label class="project-form-field"><span>Логин пользователя</span><input name="username" type="text" minlength="3" maxlength="30" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{2,29}" placeholder="Например, raymondovich" autocomplete="off" required autofocus></label><label class="project-form-field"><span>Роль в проекте</span><select name="role_id" required>' + roleOptions + '</select></label><p class="project-form-feedback" data-project-member-feedback role="status" aria-live="polite"></p><div class="project-member-dialog-actions"><button class="project-secondary-button" type="button" data-project-member-close>Отмена</button><button class="project-primary-button" type="submit"' + (roles.length ? '' : ' disabled') + '>Добавить участника</button></div></form></div></dialog>' : '';
 return '<section class="project-detail-card project-members-card"><div class="project-members-heading"><div><h3>Участники проекта</h3><p>' + members.length + ' ' + (members.length === 1 ? 'участник' : members.length > 1 && members.length < 5 ? 'участника' : 'участников') + '</p></div>' + inviteDialog + '</div><div class="project-members-list">' + memberRows + '</div></section>';
}


function trashWorkspaceMarkup(state) {
 if (!state || state.status === "loading") return '<section class="trash-page"><div class="projects-loading-state" role="status"><span class="projects-loading-indicator" aria-hidden="true"></span><p>Загружаем корзину…</p></div></section>';
 if (state.status === "error") return '<section class="trash-page"><div class="projects-empty-state projects-error-state"><h3>Не удалось загрузить корзину</h3><p>' + escapeHtml(state.message || "Попробуйте ещё раз.") + '</p><button class="project-secondary-button" type="button" data-trash-retry>Повторить</button></div></section>';
 const projects = Array.isArray(state.projects) ? state.projects : [];
 const teams = Array.isArray(state.teams) ? state.teams : [];
 const hashQuery = window.location.hash.split("?")[1] || "";
 const requestedTab = new URLSearchParams(hashQuery).get("tab");
 const activeTab = ["projects", "ideas", "teams"].includes(requestedTab) ? requestedTab : "projects";
 const dateLabel = (value) => value ? formatProjectDate(value) : "Дата неизвестна";
 const renderCards = (items, kind) => items.map((item) => {
  const canDelete = kind === "team" || item.role === "owner";
  const deadline = item.deletion_at ? Date.parse(item.deletion_at) : item.archived_at ? Date.parse(item.archived_at) + 30 * 24 * 60 * 60 * 1000 : NaN;
  const countdownLabel = () => {
   if (kind === "project" && item.retention_blocked === true) return "Удаление после архивации всех подпроектов";
   if (!Number.isFinite(deadline)) return "Срок удаления не определён";
   const remaining = Math.max(0, deadline - Date.now());
   if (remaining === 0) return "Срок хранения истёк. Удаление выполняется автоматически.";
   const days = Math.floor(remaining / 86400000);
   const hours = Math.floor((remaining % 86400000) / 3600000);
   const minutes = Math.floor((remaining % 3600000) / 60000);
   return "Удаление через " + (days ? days + " дн. " : "") + hours + " ч. " + minutes + " мин.";
  };
  const countdown = '<p class="trash-countdown" data-trash-countdown' + (Number.isFinite(deadline) ? ' data-deadline="' + deadline + '"' : '') + '>' + escapeHtml(countdownLabel()) + '</p>';
  return '<article class="trash-item-card"><div class="trash-item-copy"><span class="projects-eyebrow">' + (kind === "project" ? "ПРОЕКТ" : "КОМАНДА") + '</span><h3>' + escapeHtml(item.name || "Без названия") + '</h3>' + (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') + '<time>' + escapeHtml("В архиве с " + dateLabel(item.archived_at)) + '</time>' + countdown + '</div><div class="trash-item-actions"><button class="settings-primary-button trash-restore-button" type="button" data-trash-restore="' + kind + '" data-trash-id="' + escapeHtml(item.id) + '">Восстановить</button>' + (canDelete ? '<button class="project-danger-button trash-delete-button" type="button" data-trash-delete-open data-trash-kind="' + kind + '" data-trash-id="' + escapeHtml(item.id) + '" data-trash-name="' + escapeHtml(item.name || "Без названия") + '">Удалить навсегда</button>' : '') + '</div></article>';
 }).join("");
 const projectContent = projects.length ? '<div class="trash-item-list">' + renderCards(projects, "project") + '</div>' : '<div class="projects-empty-state trash-category-empty"><div class="projects-empty-symbol" aria-hidden="true">⌑</div><h3>Архивированных проектов нет</h3><p>Удалённые в корзину проекты будут отображаться здесь.</p></div>';
 const teamContent = teams.length ? '<div class="trash-item-list">' + renderCards(teams, "team") + '</div>' : '<div class="projects-empty-state trash-category-empty"><div class="projects-empty-symbol" aria-hidden="true">⌑</div><h3>Архивированных команд нет</h3><p>Удалённые в корзину команды будут отображаться здесь.</p></div>';
 const tabIcons = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 4V2m8 2V2M3 10h18"></path></svg>',
  ideas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.8.6 1 1.1 1 2.3h6c0-1.2.2-1.7 1-2.3A7 7 0 0 0 12 2Z"></path></svg>',
  teams: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Zm13-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1h-3"></path></svg>'
 };
 const tab = (id, label, count) => '<button class="trash-tab' + (activeTab === id ? ' is-active' : '') + '" id="trash-tab-' + id + '" type="button" role="tab" data-trash-tab="' + id + '" aria-controls="trash-panel-' + id + '" aria-selected="' + (activeTab === id ? 'true' : 'false') + '" tabindex="' + (activeTab === id ? '0' : '-1') + '"><span class="workspace-nav-icon">' + tabIcons[id] + '</span><span class="trash-tab-label">' + label + '</span>' + (count === null ? '' : '<span class="trash-tab-count">' + count + '</span>') + '</button>';
 const panel = (id, content) => '<section class="trash-tab-panel" id="trash-panel-' + id + '" role="tabpanel" aria-labelledby="trash-tab-' + id + '"' + (activeTab === id ? '' : ' hidden') + '>' + content + '</section>';
 const dialog = '<dialog class="project-delete-dialog trash-delete-dialog" data-trash-delete-dialog><div class="project-delete-dialog-panel"><div class="project-member-dialog-heading"><div><h2 data-trash-delete-title>Удалить навсегда?</h2><p data-trash-delete-description>Это действие нельзя отменить.</p></div><button class="project-member-dialog-close" type="button" data-trash-delete-close aria-label="Закрыть">×</button></div><form class="project-delete-form" data-trash-delete-form><input type="hidden" name="kind"><input type="hidden" name="id"><label class="project-form-field"><span>Пароль от аккаунта Raymondovich</span><input name="password" type="password" autocomplete="current-password" required minlength="1"></label><p class="project-form-feedback" data-trash-delete-feedback role="status" aria-live="polite"></p><div class="project-member-dialog-actions"><button class="project-secondary-button" type="button" data-trash-delete-close>Отмена</button><button class="project-danger-button" type="submit">Удалить навсегда</button></div></form></div></dialog>';
 return '<section class="trash-page"><div class="trash-tabs" role="tablist" aria-label="Категории корзины">' + tab("projects", "Проекты", projects.length) + tab("ideas", "Идеи", null) + tab("teams", "Команды", teams.length) + '</div>' +
  '<div class="trash-tab-content">' + panel("projects", projectContent) +
  panel("ideas", '<div class="trash-tab-placeholder"><div class="projects-empty-symbol" aria-hidden="true">✧</div><h3>Архив идей пока недоступен</h3><p>Для этой категории ещё не реализованы хранение, архивирование и восстановление идей. Функциональность появится после разработки домена идей.</p></div>') +
  panel("teams", teamContent) + '</div>' +
  '<p class="settings-form-feedback" data-trash-feedback role="status" aria-live="polite"></p><p class="trash-retention-note">Восстановление возвращает объект в активное состояние. Полное удаление необратимо и требует повторного ввода пароля. Подпроекты и связанные рабочие данные удаляются; неизменяемые записи аудита сохраняются.</p>' + dialog + '</section>';
}
function teamWorkspaceMarkup(state, activeSection) {
 const isDetail = /^team\/[0-9a-f-]{36}(?:\/(?:information|settings))?$/i.test(activeSection);
 const isInformation = /^team\/[0-9a-f-]{36}\/information$/i.test(activeSection);
 const isSettings = /^team\/[0-9a-f-]{36}\/settings$/i.test(activeSection);
 const data = state || { status: "loading", teams: [] };
 if (data.status === "loading") return '<section class="team-state-card"><p>Загружаем команды…</p></section>';
 if (data.status === "error") return '<section class="team-state-card"><h2>Не удалось загрузить команды</h2><p>' + escapeHtml(data.message || "Попробуйте ещё раз.") + '</p><button class="project-secondary-button" type="button" data-team-retry>Повторить</button></section>';
 if (isDetail) {
  const team = data.team;
  if (!team) return '<section class="team-state-card"><h2>Команда недоступна</h2><p>Команда не найдена или у вас нет активного доступа.</p><a class="project-secondary-button" href="#team">К списку команд</a></section>';
  const roleLabels = {owner:"Владелец",admin:"Администратор",manager:"Менеджер",member:"Участник"};
  const roleLabel = roleLabels[team.role] || "Участник";
  const createdDate = formatProjectDate(team.created_at) || "—";
  const informationCard = '<div class="project-detail-card project-info-card"><h3>Общая информация</h3><dl><div><dt>Название команды</dt><dd>' + escapeHtml(team.name) + '</dd></div><div><dt>Описание</dt><dd>' + escapeHtml(team.description || "Описание не добавлено") + '</dd></div><div><dt>Статус</dt><dd>' + (team.status === "active" ? "Активна" : "Архив") + '</dd></div><div><dt>Создана</dt><dd>' + escapeHtml(createdDate) + '</dd></div><div><dt>ID команды</dt><dd><code>' + escapeHtml(team.id) + '</code></dd></div></dl></div>';
  if (isInformation) return '<section class="project-detail project-information-page"><div class="project-detail-topline"><span class="projects-eyebrow">КОМАНДНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + escapeHtml(roleLabel) + '</span></div><div class="project-detail-heading"><h2>' + escapeHtml(team.name) + '</h2></div>' + informationCard + '<a class="project-detail-card project-settings-card project-settings-link" href="#team/' + encodeURIComponent(team.id) + '/settings"><span><h3>Настройки команды</h3><p>Архивирование и управление командой.</p></span><span class="profile-chevron" aria-hidden="true">›</span></a></section>';
  if (isSettings) return '<section class="project-detail project-information-page project-settings-page"><div class="project-detail-topline"><span class="projects-eyebrow">КОМАНДНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + escapeHtml(roleLabel) + '</span></div><div class="project-detail-heading"><div><h2>Настройки команды</h2><p>' + escapeHtml(team.name) + '</p></div></div><section class="project-detail-card project-settings-card">' + (team.role === "owner" ? '<div class="project-danger-zone"><div><h3>Архивирование команды</h3><p>Команда исчезнет из списка активных. Участники, состав команды и история сохранятся. Ожидающие приглашения будут отменены.</p></div><button class="project-danger-button" type="button" data-team-archive-open>Архивировать команду</button></div><dialog class="project-delete-dialog team-archive-dialog" data-team-archive-dialog><div class="project-delete-dialog-panel"><div class="project-member-dialog-heading"><div><h2>Архивировать команду?</h2><p>Команда «' + escapeHtml(team.name) + '» будет перемещена в архив. Её данные и участники сохранятся.</p></div><button class="project-member-dialog-close" type="button" data-team-archive-close aria-label="Закрыть">×</button></div><form class="project-delete-form" data-team-archive-form><p class="project-form-feedback" data-team-archive-feedback role="status" aria-live="polite"></p><div class="project-member-dialog-actions"><button class="project-secondary-button" type="button" data-team-archive-close>Отмена</button><button class="project-danger-button" type="submit">Подтвердить архивирование</button></div></form></div></dialog>' : '<p class="team-members-muted">Архивировать команду может только её владелец.</p>') + '</section></section>';
  const membersState = data.membersState || { status: "loading", members: [] };
  const members = Array.isArray(membersState.members) ? membersState.members : [];
  const memberRows = members.map((member) => '<div class="team-member-row"><span class="team-member-avatar" aria-hidden="true">' + escapeHtml(initials(member.username || "Участник", "TM")) + '</span><span class="team-member-copy"><strong>' + escapeHtml(member.username || "Пользователь") + '</strong><small>' + escapeHtml(member.joined_at ? "В команде с " + new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"long",year:"numeric"}).format(new Date(member.joined_at)) : "Участник команды") + '</small></span><span class="team-member-role">' + escapeHtml(roleLabels[member.role] || "Участник") + '</span></div>').join("");
  const membersContent = membersState.status === "loading"
   ? '<p class="team-members-muted">Загружаем участников…</p>'
   : membersState.status === "error"
    ? '<div class="team-members-error"><p>' + escapeHtml(membersState.message || "Не удалось загрузить участников.") + '</p><button class="project-secondary-button" type="button" data-team-members-retry>Повторить</button></div>'
    : memberRows || '<p class="team-members-muted">В команде пока нет участников.</p>';
  const invitationsState = data.invitationsState || { status: "hidden", invitations: [] };
  const canInvite = ["owner", "admin", "manager"].includes(team.role);
  const roles = team.role === "owner" ? '<option value="member">Участник</option><option value="manager">Менеджер</option><option value="admin">Администратор</option>' : team.role === "admin" ? '<option value="member">Участник</option><option value="manager">Менеджер</option>' : '<option value="member">Участник</option>';
  const rows = Array.isArray(invitationsState.invitations) ? invitationsState.invitations.map((i) => {
   const expired = i.status === "expired" || (i.expires_at && new Date(i.expires_at).getTime() <= Date.now());
   const canCancel = ["owner", "admin"].includes(team.role) && !expired;
   return '<article class="team-invitation-row"><div><strong>@' + escapeHtml(i.invitee_username) + '</strong><small>' + escapeHtml(({admin:"Администратор",manager:"Менеджер",member:"Участник"})[i.requested_role] || "Участник") + ' · ' + (expired ? 'срок истёк' : 'до ' + escapeHtml(new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"short",year:"numeric"}).format(new Date(i.expires_at)))) + '</small></div>' + (canCancel ? '<button class="team-invitation-cancel" type="button" data-team-invitation-cancel="' + escapeHtml(i.id) + '">Отменить</button>' : '') + '</article>';
  }).join("") : "";
  const invites = canInvite ? '<section class="team-invitations-card"><div class="team-members-heading"><div><h3>Приглашения</h3><p>Ожидающие приглашения в команду.</p></div></div>' + (invitationsState.status === "loading" ? '<p class="team-members-muted">Загружаем приглашения…</p>' : invitationsState.status === "error" ? '<p class="team-members-error">' + escapeHtml(invitationsState.message || "Не удалось загрузить приглашения.") + '</p><button class="project-secondary-button" type="button" data-team-invitations-retry>Повторить</button>' : rows || '<p class="team-members-muted">Ожидающих приглашений нет.</p>') + '</section>' : "";
  const inviteDialog = canInvite ? '<dialog class="team-create-dialog team-invite-dialog" data-team-invite-dialog aria-labelledby="team-invite-dialog-title"><div class="team-create-dialog-panel"><div class="settings-card-heading"><div><h2 id="team-invite-dialog-title">Пригласить участника</h2><p>Добавьте пользователя Raymondovich по его логину.</p></div><button class="public-profile-dialog-close" type="button" data-team-invite-close aria-label="Закрыть">×</button></div><form class="team-invite-form" data-team-invite-form><label class="settings-field"><span>Логин пользователя</span><input name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{2,23}" autocomplete="off" required></label><label class="settings-field"><span>Роль в команде</span><select name="role">' + roles + '</select></label><label class="settings-field"><span>Сообщение <small>Необязательно</small></span><textarea name="message" rows="3" maxlength="500"></textarea></label><p class="settings-form-feedback" data-team-invite-feedback role="status" aria-live="polite"></p><div class="team-create-actions"><button class="project-secondary-button" type="button" data-team-invite-close>Отмена</button><button class="settings-primary-button" type="submit">Отправить приглашение</button></div></form>' + invites + '</div></dialog>' : "";
  return '<section class="team-detail-panel project-detail"><div class="project-detail-topline"><span class="projects-eyebrow">КОМАНДНОЕ ПРОСТРАНСТВО</span><span class="project-card-role">' + escapeHtml(roleLabel) + '</span></div><div class="project-detail-heading"><h2>' + escapeHtml(team.name) + '</h2><a class="project-info-avatar" href="#team/' + encodeURIComponent(team.id) + '/information" aria-label="Открыть общую информацию команды" title="Общая информация команды">' + escapeHtml(initials(team.name, "TM")) + '</a></div><p>' + escapeHtml(team.description || "Описание не добавлено.") + '</p><section class="team-members-card"><div class="team-members-heading"><div><h3>Участники</h3><p>' + (membersState.status === "ready" ? members.length + " " + (members.length === 1 ? "участник" : members.length > 1 && members.length < 5 ? "участника" : "участников") : "Состав команды") + '</p></div>' + (canInvite ? '<button class="project-member-add-button" type="button" data-team-invite-open aria-label="Пригласить участника" title="Пригласить участника">+</button>' : '') + '</div><div class="team-members-list">' + membersContent + '</div></section>' + inviteDialog + '<p class="team-feature-note">Членство в команде не предоставляет доступ к проектам автоматически.</p></section>';
 }
 const teams = Array.isArray(data.teams) ? data.teams : [];
 const rows = teams.length ? teams.map((team) => '<a class="team-list-card" href="#team/' + encodeURIComponent(team.id) + '"><span class="team-list-avatar" aria-hidden="true">' + escapeHtml(initials(team.name, "TM")) + '</span><span class="team-list-copy"><strong>' + escapeHtml(team.name) + '</strong><small>' + escapeHtml(({owner:"Владелец",admin:"Администратор",manager:"Менеджер",member:"Участник"})[team.role] || "Участник") + (team.description ? " · " + escapeHtml(team.description) : "") + '</small></span><span class="profile-chevron" aria-hidden="true">›</span></a>').join("") : '<div class="team-state-card"><h2>Пока нет команд</h2><p>Создайте первую команду для совместной работы. Команды существуют независимо от проектов.</p></div>';
 return '<div class="team-workspace"><div class="team-workspace-intro"><div class="projects-toolbar-heading"><span class="projects-eyebrow">КОМАНДНОЕ ПРОСТРАНСТВО</span><h2>Команды в экосистеме</h2><p>Отдельные рабочие пространства для людей и совместной деятельности.</p></div><button class="project-primary-button projects-create-button" type="button" data-team-create-open aria-label="Создать команду" title="Создать команду"><span aria-hidden="true">+</span></button></div><div class="team-list">' + rows + '</div><dialog class="team-create-dialog" data-team-create-dialog><div class="team-create-dialog-panel"><div class="settings-card-heading"><div><h2>Новая команда</h2><p>Владелец экосистемы создаёт команды бесплатно. Для остальных пользователей потребуется активный доступ по подписке.</p></div><button class="public-profile-dialog-close" type="button" data-team-create-close aria-label="Закрыть">×</button></div><form class="settings-form" data-team-create-form><label class="settings-field"><span>Название команды</span><input name="name" type="text" minlength="2" maxlength="80" autocomplete="off" required></label><label class="settings-field"><span>Описание <small>Необязательно</small></span><textarea name="description" rows="3" maxlength="500"></textarea></label><p class="settings-form-feedback" data-team-create-feedback role="status" aria-live="polite"></p><div class="team-create-actions"><button class="project-secondary-button" type="button" data-team-create-close>Отмена</button><button class="settings-primary-button" type="submit">Создать команду</button></div></form></div></dialog></div>';
}
export function renderWorkspaceView(container, user, activeSection, profileData, projectState = null) {
 const profileSubroutes = new Set(["trash", "profile/active-projects", "profile/ecosystem-tools", "profile/settings", "profile/settings/personal-data", "profile/settings/public-info", "profile/settings/privacy", "profile/settings/appearance", "profile/settings/cryptography", "profile/settings/telegram"]);
 const isProjectCreate = activeSection === "projects/create";
 const isTrash = activeSection === "trash";
 const isTeamDetail = /^team\/[0-9a-f-]{36}(?:\/(?:information|settings))?$/i.test(activeSection);
 const isTeamRoute = activeSection === "team" || isTeamDetail;
 const isProjectInformation = /^projects\/[0-9a-f-]{36}\/information$/i.test(activeSection);
 const isProjectSettings = /^projects\/[0-9a-f-]{36}\/settings$/i.test(activeSection);
 const isProjectDetail = activeSection.startsWith("projects/") && !isProjectCreate;
 const active = profileSubroutes.has(activeSection) ? "profile" : sections.some((section) => section.id === activeSection) || isProjectCreate || isTeamDetail ? (isProjectCreate ? "projects" : isTeamDetail ? "team" : activeSection) : "projects";
 const isControlCenter = activeSection === "control-center";
 const isActiveProjects = activeSection === "profile/active-projects";
 const isEcosystemTools = activeSection === "profile/ecosystem-tools";
 const isSettings = activeSection.startsWith("profile/settings");
 const settingsTitles = { "profile/settings/personal-data": "Личные данные", "profile/settings/public-info": "Публичная информация", "profile/settings/privacy": "Конфиденциальность", "profile/settings/appearance": "Оформление", "profile/settings/cryptography": "Криптография", "profile/settings/telegram": "Telegram" };
 const title = isTrash ? "Корзина" : isControlCenter ? "Центр управления" : isTeamDetail ? (projectState?.team?.name || "Команда") : isProjectSettings ? "Настройки проекта" : isProjectDetail ? (projectState?.project?.name || "Проект") : isProjectCreate ? "Создание проекта" : isActiveProjects ? "Действующие проекты" : isEcosystemTools ? "Инструменты экосистемы" : isSettings ? (settingsTitles[activeSection] || "Настройки") : sections.find((section) => section.id === active).label;
 const isProjects = active === "projects";
 const subrouteContent = isActiveProjects
  ? '<div class="workspace-empty-state"><div class="workspace-empty-inner"><div class="workspace-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M7 15h3l2-4 2 3h3"></path></svg></div><h2>Действующие проекты появятся здесь</h2><p>В этом разделе будут только запущенные проекты, которые уже приносят доход. Проекты в разработке будут доступны через общий раздел «Проекты».</p></div></div>'
  : '<div class="ecosystem-tools-catalog"><p class="workspace-catalog-intro">Полный каталог инструментов экосистемы. Доступность каждого инструмента определяется отдельно и не влияет на его отображение в этом каталоге.</p><div class="workspace-tool-category"><h2>Инструменты разработки</h2><div class="workspace-tool-grid">' +
    ['GitHub','Supabase','Cloudflare','REG.RU','ChatGPT','Claude'].map((name) => '<article class="workspace-tool-card"><span class="workspace-tool-mark" aria-hidden="true">' + escapeHtml(name.slice(0,1)) + '</span><div><h3>' + escapeHtml(name) + '</h3><p>Инструмент экосистемы</p></div><span class="workspace-tool-status">Планируется</span></article>').join('') +
    '</div></div><p class="workspace-catalog-note">Каталог будет расширяться по мере подключения и запуска инструментов Raymondovich.</p></div>';
 const projectCreateContent = '<section class="project-create-panel"><div class="project-create-intro"><span class="project-create-kicker">НОВЫЙ ПРОЕКТ</span><h2>Начните с идеи</h2><p>Создайте пространство проекта. Позже вы сможете подключить участников и доступные вам инструменты экосистемы.</p></div><form class="project-create-form" data-project-create-form><label class="project-form-field"><span>Название проекта</span><input name="project_name" type="text" minlength="1" maxlength="120" placeholder="Например, мой новый проект" autocomplete="off" required></label><label class="project-form-field"><span>Тип проекта</span><select name="project_type" required><option value="online">Онлайн-проект</option><option value="offline">Офлайн-проект</option></select></label><fieldset class="project-component-options" data-project-components><legend>Компоненты онлайн-проекта <small>Можно выбрать несколько</small></legend><label><input type="checkbox" name="component_codes" value="website"><span>Сайт</span></label><label><input type="checkbox" name="component_codes" value="telegram_bot"><span>Telegram-бот</span></label><label><input type="checkbox" name="component_codes" value="telegram_mini_app"><span>Telegram Mini App</span></label><label><input type="checkbox" name="component_codes" value="ios_app"><span>iOS-приложение</span></label></fieldset><label class="project-form-field"><span>Краткое описание <small>Необязательно</small></span><textarea name="project_description" rows="4" maxlength="500" placeholder="Расскажите, над чем вы планируете работать"></textarea><small class="project-field-hint">До 500 символов</small></label><div class="project-create-note"><span aria-hidden="true">ⓘ</span><p>Вы станете владельцем созданного проекта. Компоненты можно указать для онлайн-проектов.</p></div><div class="project-create-actions"><a class="project-secondary-button" href="#projects">Отмена</a><button class="project-primary-button" type="submit">Создать проект</button></div><p class="project-form-feedback" data-project-feedback role="status" aria-live="polite"></p></form></section>';
 const content = isTrash
  ? trashWorkspaceMarkup(projectState)
  : isControlCenter
  ? (user?.app_metadata?.raymondovich_role === "owner" ? '<section class="workspace-empty-state"><div class="workspace-empty-inner"><h2>Центр управления</h2><p>Рабочие инструменты управления экосистемой будут размещены здесь.</p></div></section>' : '<section class="workspace-empty-state"><div class="workspace-empty-inner"><h2>Доступ ограничен</h2><p>Центр управления доступен только владельцу экосистемы.</p></div></section>')
  : isTeamRoute
  ? teamWorkspaceMarkup(projectState, activeSection)
  : isProjectDetail
  ? projectDetailMarkup(projectState, isProjectInformation, isProjectSettings)
  : isProjectCreate
  ? projectCreateContent
  : isSettings
  ? settingsMarkup(user, profileData, activeSection, projectState)
  : isActiveProjects || isEcosystemTools
  ? subrouteContent
  : active === "profile"
   ? profileMarkup(user, profileData)
   : isProjects
    ? projectsOverviewMarkup(projectState)
    : '<div class="workspace-empty-state"><div class="workspace-empty-inner"><div class="workspace-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5m0-8h.01"></path></svg></div><h2>Раздел подключим следующим этапом</h2><p>Навигация уже общая для рабочего пространства. Функциональность раздела будет добавлена отдельно.</p></div></div>';
 container.innerHTML = '<dialog class="notification-center-dialog" data-notification-center aria-labelledby="notification-center-title"><div class="notification-center-panel"><header class="notification-center-heading"><div><h2 id="notification-center-title">Уведомления</h2><p>События и приглашения экосистемы.</p></div><button class="public-profile-dialog-close" type="button" data-notification-center-close aria-label="Закрыть">×</button></header><div class="notification-center-list" data-notification-list><p class="notification-center-muted">Загружаем уведомления…</p></div></div></dialog><div class="workspace-layout">' +
  '<section class="workspace-content" aria-labelledby="workspace-title">' +
  ((isTrash || isProjectDetail || isTeamRoute || isProjects) ? "" : '<header class="workspace-page-heading"><div><h1 id="workspace-title">' + title + '</h1>' +
  ((active === "profile" && !isControlCenter && !isActiveProjects && !isEcosystemTools && !isSettings) ? "" : '<p>' +
   (isTrash ? "Архивированные проекты и команды, которые можно восстановить." : active === "profile" ? (isControlCenter ? "Управление экосистемой Raymondovich." : isActiveProjects ? "Запущенные проекты, которые уже запущены и приносят доход." : isEcosystemTools ? "Полный каталог инструментов экосистемы Raymondovich." : isSettings ? (activeSection === "profile/settings" ? "Выберите группу настроек." : "Настройка параметров выбранной группы.") : "") : isProjectCreate ? "Укажите основную информацию о будущем проекте." : isProjects ? "" : "Рабочее пространство Raymondovich.") +
   '</p>') +
  '</div></header>') + content + '</section></div>' + workspaceNavigationMarkup(active);
}

export function renderPublicProfileView(container, payload, errorMessage = "") {
 const profile = payload?.profile;
 if (!profile) {
  container.innerHTML = '<section class="public-profile-page"><div class="public-profile-error"><h1>Публичный профиль недоступен</h1><p>' + escapeHtml(errorMessage || "Пользователь отключил публичную карточку или ссылка неверна.") + '</p><a class="settings-primary-button" href="#register">Создать аккаунт</a></div></section>';
  return;
 }
 const avatar = initials(profile.full_name, profile.username);
 const socials = [
  ["Telegram", profile.telegram_url],
  ["Instagram", profile.instagram_url],
  ["YouTube", profile.youtube_url]
 ].filter(([, url]) => typeof url === "string" && url.startsWith("https://"));
 const projects = Array.isArray(profile.projects) ? profile.projects : [];
 container.innerHTML = '<section class="public-profile-page"><article class="public-profile-card"><header class="public-profile-heading"><div class="profile-avatar" aria-hidden="true">' + escapeHtml(avatar) + '</div><div><h1>' + escapeHtml(profile.full_name || "Пользователь Raymondovich") + '</h1><p>@' + escapeHtml(profile.username || "") + '</p></div></header>' +
  (typeof profile.about === "string" && profile.about.trim() ? '<section class="public-profile-about-section" aria-labelledby="public-profile-about-title"><h2 id="public-profile-about-title">О себе</h2><p class="public-profile-about">' + escapeHtml(profile.about.trim()) + '</p></section>' : '') +
  (projects.length ? '<section class="public-profile-projects"><h2>Проекты</h2>' + projects.map((project) => '<article class="public-profile-project-card"><h3>' + escapeHtml(project.name) + '</h3>' + (project.description ? '<p>' + escapeHtml(project.description) + '</p>' : '') + '</article>').join("") + '</section>' : '') +
  (socials.length ? '<nav class="public-profile-social-icons" aria-label="Социальные сети">' + socials.map(([label,url]) => {
   const icons = {
    Telegram: '<path d="m21 3-7.2 18-4.1-7.1L3 10.2 21 3Z"/><path d="m9.7 13.9 5.1-5.1"/>',
    Instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    YouTube: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z"/>'
   };
   return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + label + '" title="' + label + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + icons[label] + '</svg></a>';
  }).join("") + '</nav>' : '') +
  '<footer class="public-profile-brand"><span>Дата регистрации</span><time datetime="' + escapeHtml(profile.registered_at || "") + '">' + escapeHtml(profile.registered_at ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(profile.registered_at)) : "—") + '</time></footer></article></section>';
}