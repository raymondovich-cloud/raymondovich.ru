import { getProjectAnalytics } from "/source/application/analytics/project-analytics.js";

export async function renderProjectAnalyticsScreen(host, project) {
  const data = await getProjectAnalytics(project.id);
  host.innerHTML = `
    <section class="projects-module-empty">
      <div class="projects-empty-mark" aria-hidden="true">⌁</div>
      <h2>Источники аналитики пока не подключены</h2>
      <p>Здесь появятся показатели пользователей, онлайн по часам и периодам, динамика прироста и статистика партнёрских ссылок с указанием источника и периода измерения.</p>
      <span class="projects-coming-label">${data.state==="not_configured"?"ОЖИДАЕТ ПОДКЛЮЧЕНИЯ ИСТОЧНИКОВ":"ДАННЫЕ ЗАГРУЖЕНЫ"}</span>
    </section>`;
}
