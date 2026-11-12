import {
  getFavorites,
  isFavorite,
  addProjectToFavorites,
  removeProjectFromFavorites,
  addIdeaToFavorites,
  removeIdeaFromFavorites
} from "/source/application/favorites/favorites.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);

export function favoriteButtonMarkup(type, id, active = false) {
  const label = active ? "Убрать из избранного" : "Добавить в избранное";
  return `<button type="button" class="favorite-toggle${active ? " is-active" : ""}" data-favorite-toggle data-favorite-type="${type}" data-favorite-id="${escape(id)}" aria-pressed="${active}" aria-label="${label}" title="${label}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>
  </button>`;
}

export async function favoriteButtonFor(type, id) {
  const result = await isFavorite(type === "project" ? { projectId:id } : { ideaId:id });
  if (result.error) throw result.error;
  return favoriteButtonMarkup(type,id,Boolean(result.data));
}

export function bindFavoriteToggle(root, onChanged = () => {}) {
  root.addEventListener("click", async event => {
    const button = event.target.closest("[data-favorite-toggle]");
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    const type = button.dataset.favoriteType;
    const id = button.dataset.favoriteId;
    if (!id || !["project","idea"].includes(type)) return;
    const active = button.getAttribute("aria-pressed") === "true";
    button.disabled = true;
    try {
      const result = active
        ? (type === "project" ? await removeProjectFromFavorites(id) : await removeIdeaFromFavorites(id))
        : (type === "project" ? await addProjectToFavorites(id) : await addIdeaToFavorites(id));
      if (result.error) throw result.error;
      const next = !active;
      button.classList.toggle("is-active",next);
      button.setAttribute("aria-pressed",String(next));
      const label = next ? "Убрать из избранного" : "Добавить в избранное";
      button.setAttribute("aria-label",label);
      button.title = label;
      onChanged({ type, id, isFavorite:next });
    } catch (error) {
      window.alert(error?.message || "Не удалось обновить избранное.");
    } finally {
      button.disabled = false;
    }
  });
}

export async function renderFavoritesScreen(root) {
  root.dataset.appScreen = "favorites";
  root.innerHTML = `<section class="profile-subscreen profile-favorites-screen app-ui-v3-frame" aria-labelledby="favorites-title">
    <header class="profile-subscreen-header"><h1 class="app-ui-v3-heading" id="favorites-title">Избранное</h1></header>
    <div class="profile-favorites-list" data-favorites-list><p class="profile-favorites-state">Загрузка избранного…</p></div>
  </section>`;
  const host = root.querySelector("[data-favorites-list]");
  const result = await getFavorites();
  if (root.dataset.appScreen !== "favorites") return;
  if (result.error) {
    host.innerHTML = '<p class="profile-favorites-state is-error">Не удалось загрузить избранное. Проверьте подключение и права доступа.</p>';
    return;
  }
  if (!result.data.length) {
    host.innerHTML = '<div class="profile-empty app-ui-v3-empty"><span>Здесь появятся проекты и идеи, которые вы добавите в избранное.</span></div>';
    return;
  }
  host.innerHTML = result.data.map(item => `
    <article class="profile-favorite-row">
      <button type="button" class="profile-favorite-open" data-favorite-open-type="${item.type}" data-favorite-open-id="${escape(item.id)}">
        <span class="profile-favorite-type">${item.type === "project" ? "ПРОЕКТ" : "ИДЕЯ"}</span>
        <strong>${escape(item.name || "Без названия")}</strong>
        <small>${escape(item.status || "Статус не указан")}</small>
      </button>
      ${favoriteButtonMarkup(item.type,item.id,true)}
    </article>`).join("");
  bindFavoriteToggle(host, () => renderFavoritesScreen(root));
  host.addEventListener("click", event => {
    const open = event.target.closest("[data-favorite-open-type]");
    if (!open) return;
    const navigation = window.RaymondovichNavigation;
    if (open.dataset.favoriteOpenType === "project") {
      navigation?.navigateRoute("#authorization/projects");
      navigation?.navigateScreen("project-overview",{projectId:open.dataset.favoriteOpenId});
    } else {
      navigation?.navigateRoute("#authorization/ideas");
      navigation?.navigateScreen("idea-detail",{ideaId:open.dataset.favoriteOpenId});
    }
  });
}
