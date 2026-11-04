// version 2.0
import { supabase } from "../../infrastructure/supabase/client.js";

const PROJECT_FIELDS = "id, owner_id, source_idea_id, name, description, goal, status, priority, target_start_date, target_due_date, created_at, updated_at, is_pinned";

function normalizeError(error, fallback = "Не удалось выполнить операцию с проектом.") {
  if (!error) return null;
  return new Error(error.message || fallback);
}

export async function listProjects(ownerId) {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw normalizeError(error);
  return data || [];
}

export async function createProjectFromIdea(idea, ownerId) {
  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("owner_id", ownerId)
    .eq("source_idea_id", idea.id)
    .maybeSingle();
  if (lookupError) throw normalizeError(lookupError);

  if (existing) {
    const { error: syncError } = await supabase.from("ideas")
      .update({ status: "launched", launched_at: idea.launched_at || new Date().toISOString() })
      .eq("id", idea.id).eq("owner_id", ownerId);
    if (syncError) throw normalizeError(syncError, "Проект найден, но не удалось обновить статус исходной идеи.");
    return existing;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: ownerId,
      source_idea_id: idea.id,
      name: idea.name,
      description: idea.description || "",
      goal: "",
      completion_criteria: "",
      status: "active",
      priority: idea.priority || "normal",
    })
    .select(PROJECT_FIELDS)
    .single();
  if (error) throw normalizeError(error);

  const { error: ideaError } = await supabase.from("ideas")
    .update({ status: "launched", launched_at: new Date().toISOString() })
    .eq("id", idea.id)
    .eq("owner_id", ownerId);
  if (ideaError) {
    await supabase.from("projects").delete().eq("id", project.id).eq("owner_id", ownerId);
    throw normalizeError(ideaError, "Не удалось завершить запуск идеи. Создание проекта отменено.");
  }
  return project;
}

export async function updateProject(id, ownerId, changes) {
  const allowed = {};
  for (const key of ["status", "priority"]) {
    if (Object.hasOwn(changes, key)) allowed[key] = changes[key];
  }
  const { data, error } = await supabase
    .from("projects")
    .update(allowed)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(PROJECT_FIELDS)
    .single();
  if (error) throw normalizeError(error);
  return data;
}

export async function deleteProject(id, ownerId) {
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) throw normalizeError(error);
}
