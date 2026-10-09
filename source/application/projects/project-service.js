// version 1.5
import { supabase } from "../../infrastructure/supabase/client.js";

export async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("pin_order", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const projects = data ?? [];
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project.id);
  const ownerIds = [...new Set(projects.map((project) => project.owner_id).filter(Boolean))];

  const [milestoneResult, profileResult] = await Promise.all([
    supabase.from("project_milestones").select("*").in("project_id", projectIds).order("position"),
    ownerIds.length
      ? supabase.from("user_profiles").select("user_id, display_name").in("user_id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (milestoneResult.error) throw milestoneResult.error;
  if (profileResult.error) throw profileResult.error;

  const milestones = milestoneResult.data ?? [];
  const milestoneIds = milestones.map((milestone) => milestone.id);
  let tasks = [];

  if (milestoneIds.length) {
    const { data: taskData, error: taskError } = await supabase
      .from("project_tasks")
      .select("*")
      .in("milestone_id", milestoneIds)
      .order("position");
    if (taskError) throw taskError;
    tasks = taskData ?? [];
  }

  const names = new Map((profileResult.data ?? []).map((profile) => [profile.user_id, profile.display_name]));
  return projects.map((project) => {
    const projectMilestones = milestones
      .filter((milestone) => milestone.project_id === project.id)
      .map((milestone) => ({
        ...milestone,
        tasks: tasks.filter((task) => task.milestone_id === milestone.id),
      }));
    const enrichedProject = {
      ...project,
      milestones: projectMilestones,
      owner_name: names.get(project.owner_id) || project.owner_id || "Неизвестно",
    };
    return { ...enrichedProject, progress: calculateProgress(enrichedProject) };
  });
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

export async function setProjectPinned(projectId, pinned) {
  const id = String(projectId || "").trim();
  if (!id) throw new Error("Проект не указан.");

  let pinOrder = null;
  if (pinned) {
    const { data, error } = await supabase
      .from("projects")
      .select("pin_order")
      .eq("is_pinned", true)
      .order("pin_order", { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    pinOrder = Number(data?.[0]?.pin_order || 0) + 1;
  }

  const { error } = await supabase
    .from("projects")
    .update({ is_pinned: Boolean(pinned), pin_order: pinOrder })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProjectName(projectId, name) {
  const id = String(projectId || "").trim();
  const value = String(name || "").trim();
  if (!id) throw new Error("Проект не указан.");
  if (!value) throw new Error("Название проекта не может быть пустым.");
  if (value.length > 120) throw new Error("Название проекта слишком длинное.");

  const { error } = await supabase.from("projects").update({
    name: value,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw error;
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
  const id = String(projectId || "").trim();
  if (!id) throw new Error("Проект не указан.");
  if (!plan || !Array.isArray(plan.milestones) || !plan.milestones.length) {
    throw new Error("План должен содержать milestones.");
  }

  const normalizedMilestones = plan.milestones.map((milestone, milestoneIndex) => {
    const title = String(milestone.title || "").trim();
    const weight = Number(milestone.weight);
    const tasks = Array.isArray(milestone.tasks) ? milestone.tasks : [];

    if (!title) throw new Error("У каждого этапа должно быть название.");
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("Вес каждого этапа должен быть положительным числом.");
    }
    if (!tasks.length) {
      throw new Error("У этапа «" + title + "» должна быть хотя бы одна задача.");
    }

    const normalizedTasks = tasks.map((task, taskIndex) => {
      const taskTitle = String(task.title || "").trim();
      const taskWeight = Number(task.weight ?? 1);
      if (!taskTitle) throw new Error("У каждой задачи должно быть название.");
      if (!Number.isFinite(taskWeight) || taskWeight <= 0) {
        throw new Error("Вес каждой задачи должен быть положительным числом.");
      }
      return {
        title: taskTitle,
        description: String(task.description || "").trim(),
        weight: taskWeight,
        position: taskIndex,
      };
    });

    return {
      title,
      description: String(milestone.description || "").trim(),
      weight,
      position: milestoneIndex,
      tasks: normalizedTasks,
    };
  });

  const totalWeight = normalizedMilestones.reduce((s, m) => s + m.weight, 0);
  if (Math.round(totalWeight * 100) / 100 !== 100) {
    throw new Error("Сумма весов этапов должна быть ровно 100.");
  }

  const { error: deleteError } = await supabase
    .from("project_milestones")
    .delete()
    .eq("project_id", id);

  if (deleteError) throw deleteError;

  for (const milestone of normalizedMilestones) {
    const { data: created, error } = await supabase.from("project_milestones").insert({
      project_id: id,
      title: milestone.title,
      description: milestone.description,
      weight: milestone.weight,
      position: milestone.position,
    }).select().single();

    if (error) throw error;

    const { error: taskError } = await supabase.from("project_tasks").insert(
      milestone.tasks.map((task) => ({
        milestone_id: created.id,
        title: task.title,
        description: task.description,
        weight: task.weight,
        position: task.position,
      }))
    );

    if (taskError) throw taskError;
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
