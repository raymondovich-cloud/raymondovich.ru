export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function workspaceToolbar({
  searchAttr,
  searchLabel,
  searchPlaceholder,
  searchValue = "",
  filterToggleAttr,
  filterPanelId,
  createAttr,
  createLabel
}) {
  const safe = escapeHtml;
  return `<div class="ws-toolbar">
    <input class="ws-search" type="search" aria-label="${safe(searchLabel)}" placeholder="${safe(searchPlaceholder)}" value="${safe(searchValue)}" ${searchAttr}>
    <div class="ws-toolbar-actions">
      <button class="ws-icon-button" type="button" ${filterToggleAttr} aria-label="Настройки фильтрации" aria-expanded="false" aria-controls="${safe(filterPanelId)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <button class="ws-icon-button is-accent" type="button" ${createAttr} aria-label="${safe(createLabel)}" title="${safe(createLabel)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
  </div>`;
}

export function workspaceFilters({ id, attributes = "", fields = [] }) {
  return `<div class="ws-filters" id="${escapeHtml(id)}" ${attributes} hidden>
    ${fields.map(field => `<label>${escapeHtml(field.label)}${field.control}</label>`).join("")}
  </div>`;
}

export function workspaceStatGrid(stats = []) {
  return `<div class="ws-stat-grid">${stats.map((stat, index) => `
    <article class="ws-stat${stat.accent || index === 1 ? " is-accent" : ""}">
      <span>${escapeHtml(stat.label)}</span><strong ${stat.valueAttr || ""}>${escapeHtml(stat.value ?? "—")}</strong>
    </article>`).join("")}</div>`;
}

export function workspaceSectionTitle(text, { muted = false } = {}) {
  return `<h2 class="ws-section-title${muted ? " is-muted" : ""}">${escapeHtml(text)}</h2>`;
}

export function workspaceScreenHead({ title, subtitle = "" }) {
  return `<header class="ws-screen-head"><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</header>`;
}

export function workspacePageTitle(text) {
  return `<h1 class="ws-page-title">${escapeHtml(text)}</h1>`;
}
