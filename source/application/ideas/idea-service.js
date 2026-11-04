// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

const IDEA_FIELDS = "id, owner_id, name, description, status, priority, created_at, updated_at, launched_at";

function normalizeError(error, fallback = "Не удалось выполнить операцию с идеей.") {
  if (!error) return null;
  return new Error(error.message || fallback);
}

export async function listIdeas(ownerId) {
  const { data, error } = await supabase
    .from("ideas")
    .select(IDEA_FIELDS)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw normalizeError(error);
  return data || [];
}

export async function createIdea({ ownerId, title, description = "" }) {
  const name = title.trim();
  if (!name) throw new Error("Добавь короткое название идеи.");
  const { data, error } = await supabase
    .from("ideas")
    .insert({ owner_id: ownerId, name, description: description.trim() })
    .select(IDEA_FIELDS)
    .single();
  if (error) throw normalizeError(error);
  return data;
}

export async function updateIdea(id, ownerId, changes) {
  const allowed = {};
  for (const key of ["status", "priority"]) {
    if (Object.hasOwn(changes, key)) allowed[key] = changes[key];
  }
  const { data, error } = await supabase
    .from("ideas")
    .update(allowed)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(IDEA_FIELDS)
    .single();
  if (error) throw normalizeError(error);
  return data;
}

export async function deleteIdea(id, ownerId) {
  const { error } = await supabase.from("ideas").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) throw normalizeError(error);
}
