import { getProjectAccounting } from "/source/application/accounting/project-accounting.js";

export async function renderProjectAccountingScreen(host, project) {
  const data = await getProjectAccounting(project.id);
  host.innerHTML = `
    <section class="projects-module-empty">
      <div class="projects-empty-mark" aria-hidden="true">₽</div>
      <h2>Финансовый учёт пока не настроен</h2>
      <p>Здесь будут храниться доходы, расходы, платежи за сервисы, продвижение и другие операции. Сводные показатели будут рассчитываться только по сохранённым операциям.</p>
      <span class="projects-coming-label">${data.state==="not_configured"?"МОДУЛЬ ПОДГОТАВЛИВАЕТСЯ К ВВОДУ ДАННЫХ":"ДАННЫЕ ЗАГРУЖЕНЫ"}</span>
    </section>`;
}
