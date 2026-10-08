// version 1.2
import { supabase } from "../../infrastructure/supabase/client.js";

export async function listProjects() {
  const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProject(projectId) {
  const [{ data: project, error: projectError }, { data: milestones, error: milestoneError }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("project_milestones").select("*").eq("project_id", projectId).order("position"),
  ]);
  if (projectError) throw projectError;
  if (milestoneError) throw milestoneError;

  const ids = (milestones ?? []).map((item) => item.id);
  let tasks = [];
  if (ids.length) {
    const { data, error } = await supabase.from("project_tasks").select("*").in("milestone_id", ids).order("position");
    if (error) throw error;
    tasks = data ?? [];
  }

  return {
    ...project,
    milestones: (milestones ?? []).map((m) => ({
      ...m,
      tasks: tasks.filter((t) => t.milestone_id === m.id),
    })),
  };
}

export function calculateProgress(project) {
  const milestones = project.milestones ?? [];
  const total = milestones.reduce((sum, m) => sum + Number(m.weight || 0), 0);
  if (!total) return 0;

  const completed = milestones.reduce((sum, m) => {
    const tasks = m.tasks ?? [];
    const taskTotal = tasks.reduce((s, t) => s + Number(t.weight || 0), 0);
    const taskDone = tasks.filter((t) => t.completed).reduce((s, t) => s + Number(t.weight || 0), 0);
    return sum + (taskTotal ? Number(m.weight) * taskDone / taskTotal : 0);
  }, 0);

  return Math.round(completed / total * 100);
}

function normalizeWeights(count) {
  if (!count) return [];
  const base = Math.floor(10000 / count) / 100;
  const weights = Array.from({ length: count }, () => base);
  let remainder = Math.round((100 - base * count) * 100) / 100;
  for (let i = 0; remainder > 0; i = (i + 1) % count) {
    weights[i] = Math.round((weights[i] + 0.01) * 100) / 100;
    remainder = Math.round((remainder - 0.01) * 100) / 100;
  }
  return weights;
}

function buildPlanFromCriteria(criteria) {
  const lines = String(criteria || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*$/);
    if (heading) {
      current = { title: heading[1].trim(), description: "", tasks: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const bullet = line.match(/^[-•]\s+(.+)$/);
    if (bullet) {
      const text = bullet[1].replace(/^\*\*|\*\*$/g, "").trim();
      if (text) current.tasks.push({ title: text, description: "", weight: 1 });
      continue;
    }

    if (line && !current.description && !line.startsWith("100%")) {
      current.description = line.replace(/^\*\*|\*\*$/g, "").trim();
    }
  }

  const valid = sections.filter((section) => section.title && section.tasks.length);
  if (valid.length) {
    const weights = normalizeWeights(valid.length);
    return {
      milestones: valid.map((section, index) => ({
        title: section.title,
        description: section.description || "Этап проекта, сформированный из критериев готовности 100%.",
        weight: weights[index],
        tasks: section.tasks,
      })),
    };
  }

  const fallback = [
    "Формализация требований",
    "Архитектура и данные",
    "Основная реализация",
    "Интеграции и автоматизация",
    "Интеллектуальный слой",
    "Интерфейс и пользовательский опыт",
    "Тестирование и безопасность",
    "Production и запуск",
  ];

  return {
    milestones: fallback.map((title, index) => ({
      title,
      description: "Универсальный этап жизненного цикла проекта.",
      weight: index === fallback.length - 1 ? 12.5 : 12.5,
      tasks: [{
        title: index === 0
          ? "Зафиксировать требования и критерии готовности проекта."
          : "Выполнить работы этапа и подтвердить результат проверкой.",
        description: criteria ? "Опирается на определение готовности проекта." : "",
        weight: 1,
      }],
    })),
  };
}

async function seedPlan(projectId, criteria) {
  const plan = buildPlanFromCriteria(criteria);
  await importPlan(projectId, plan);
  return plan;
}

export async function createProject(values) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Сессия пользователя не найдена.");

  const name = String(values.name || "").trim();
  const description = String(values.description || "").trim();
  const goal = String(values.goal || "").trim();
  const completionCriteria = String(values.completionCriteria || "").trim();

  if (!name) throw new Error("Укажи название проекта.");
  if (!completionCriteria) throw new Error("Укажи, что должно быть правдой при 100%.");

  const { data, error } = await supabase.from("projects").insert({
    owner_id: user.id,
    name,
    description,
    goal,
    completion_criteria: completionCriteria,
  }).select().single();

  if (error) throw error;

  try {
    await seedPlan(data.id, completionCriteria);
  } catch (error) {
    await supabase.from("projects").delete().eq("id", data.id);
    throw new Error("Проект создан, но карта проекта не сформировалась: " + (error.message || "неизвестная ошибка"));
  }

  return data;
}

export async function deleteProject(projectId) {
  const id = String(projectId || "").trim();
  if (!id) throw new Error("Проект не указан.");

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTask(taskId, completed) {
  const { error } = await supabase.from("project_tasks").update({
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId);
  if (error) throw error;
}

export async function importPlan(projectId, plan) {
  if (!plan || !Array.isArray(plan.milestones) || !plan.milestones.length) {
    throw new Error("План должен содержать milestones.");
  }

  const totalWeight = plan.milestones.reduce((s, m) => s + Number(m.weight || 0), 0);
  if (Math.round(totalWeight * 100) / 100 !== 100) {
    throw new Error("Сумма весов этапов должна быть ровно 100.");
  }

  for (const [i, milestone] of plan.milestones.entries()) {
    const title = String(milestone.title || "").trim();
    if (!title) throw new Error("У каждого этапа должно быть название.");

    const { data: created, error } = await supabase.from("project_milestones").insert({
      project_id: projectId,
      title,
      description: String(milestone.description || "").trim(),
      weight: Number(milestone.weight),
      position: i,
    }).select().single();

    if (error) throw error;

    const tasks = Array.isArray(milestone.tasks) ? milestone.tasks : [];
    if (tasks.length) {
      const { error: taskError } = await supabase.from("project_tasks").insert(tasks.map((task, index) => ({
        milestone_id: created.id,
        title: String(task.title || "").trim(),
        description: String(task.description || "").trim(),
        weight: Number(task.weight || 1),
        position: index,
      })));
      if (taskError) throw taskError;
    }
  }
}

export function createChatGptPrompt(project) {
  return "Ты — AI Project Manager проекта «" + project.name + "».\n\nИдея проекта:\n" +
    (project.description || "Не указана") + "\n\nЦель:\n" + (project.goal || "Не указана") +
    "\n\nКритерии 100%:\n" + (project.completion_criteria || "Не указаны") +
    "\n\nСформируй конечную карту проекта. Верни только JSON:\n" +
    JSON.stringify({ milestones: [{ title: "Название этапа", description: "Что должно быть достигнуто", weight: 20, tasks: [{ title: "Конкретная задача", description: "Что нужно сделать", weight: 1 }] }] }, null, 2) +
    "\n\nПравила: сумма weight этапов = 100; этапы измеримые; задачи конкретные и проверяемые; 100% означает реальную готовность.";
}
