import { getProjectMarketing } from "/source/application/marketing/project-marketing.js";

export async function renderProjectMarketingScreen(host, project) {
  const data = await getProjectMarketing(project.id);
  host.innerHTML = `
    <section class="projects-module-empty">
      <div class="projects-empty-mark" aria-hidden="true">◉</div>
      <h2>Маркетинговые площадки пока не добавлены</h2>
      <p>Здесь будут храниться каналы продвижения, аккаунты, публикации и кампании. Автоматическая статистика будет подключаться по официальным API там, где платформы это разрешают.</p>
      <span class="projects-coming-label">${data.state==="not_configured"?"МОДУЛЬ ПОДГОТАВЛИВАЕТСЯ К ВВОДУ ДАННЫХ":"ДАННЫЕ ЗАГРУЖЕНЫ"}</span>
    </section>`;
}
