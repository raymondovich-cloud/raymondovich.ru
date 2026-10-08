// version 1.0
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
  return { ...project, milestones: (milestones ?? []).map((m) => ({ ...m, tasks: tasks.filter((t) => t.milestone_id === m.id) })) };
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

export async function createProject(values) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Сессия пользователя не найдена.");
  const { data, error } = await supabase.from("projects").insert({
    owner_id: user.id,
    name: values.name.trim(),
    description: values.description.trim(),
    goal: values.goal.trim(),
    completion_criteria: values.completionCriteria.trim(),
  }).select().single();
  if (error) throw error;
  return data;
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
  if (!plan || !Array.isArray(plan.milestones) || !plan.milestones.length) throw new Error("План должен содержать milestones.");
  const totalWeight = plan.milestones.reduce((s, m) => s + Number(m.weight || 0), 0);
  if (Math.round(totalWeight * 100) / 100 !== 100) throw new Error("Сумма весов этапов должна быть ровно 100.");
  for (const [i, milestone] of plan.milestones.entries()) {
    const { data: created, error } = await supabase.from("project_milestones").insert({
      project_id: projectId, title: milestone.title.trim(), description: (milestone.description || "").trim(),
      weight: Number(milestone.weight), position: i,
    }).select().single();
    if (error) throw error;
    const tasks = milestone.tasks || [];
    if (tasks.length) {
      const { error: taskError } = await supabase.from("project_tasks").insert(tasks.map((task, index) => ({
        milestone_id: created.id, title: task.title.trim(), description: (task.description || "").trim(),
        weight: Number(task.weight || 1), position: index,
      })));
      if (taskError) throw taskError;
    }
  }
}

export function createChatGptPrompt(project) {
  return "Ты — AI Project Manager проекта «" + project.name + "».\n\nИдея проекта:\n" +
    (project.description || "Не указана") + "\n\nЦель:\n" + (project.goal || "Не указана") +
    "\n\nСформируй конечную карту проекта, где 100% означает полностью готовый проект. Верни только JSON:\n" +
    JSON.stringify({ milestones: [{ title: "Название этапа", description: "Что должно быть достигнуто", weight: 20, tasks: [{ title: "Конкретная задача", description: "Что нужно сделать", weight: 1 }] }] }, null, 2) +
    "\n\nПравила: сумма weight этапов = 100; этапы измеримые; задачи конкретные и проверяемые; 100% означает реальную готовность.";
}
