// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

const PROJECT_FIELDS = "id, name, description, goal, status, priority, target_start_date, target_due_date, created_at, updated_at, is_pinned";

function normalizeError(error) {
  if (!error) return null;
  return new Error(error.message || "Не удалось выполнить операцию с проектом.");
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

export async function createIdea({ ownerId, title, description = "" }) {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Добавь короткое название идеи.");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: ownerId,
      name: cleanTitle,
      description: description.trim(),
      goal: "",
      completion_criteria: "",
      status: "idea",
      priority: "normal",
    })
    .select(PROJECT_FIELDS)
    .single();

  if (error) throw normalizeError(error);
  return data;
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
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw normalizeError(error);
}
