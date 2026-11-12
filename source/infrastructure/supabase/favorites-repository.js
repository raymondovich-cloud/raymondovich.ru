import { supabase } from "./client.js";

const FAVORITE_FIELDS = "id,project_id,idea_id,created_at";

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { userId: null, error };
  if (!data?.user?.id) return { userId: null, error: new Error("Требуется авторизация.") };
  return { userId: data.user.id, error: null };
}

async function insertFavorite(targetField, targetId) {
  const { userId, error } = await getCurrentUserId();
  if (error) return { data: null, error };
  return supabase
    .from("user_favorites")
    .insert({ user_id: userId, [targetField]: targetId })
    .select(FAVORITE_FIELDS)
    .single();
}

async function deleteFavorite(targetField, targetId) {
  const { userId, error } = await getCurrentUserId();
  if (error) return { data: null, error };
  return supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq(targetField, targetId)
    .select("id")
    .maybeSingle();
}

export async function listFavoriteRelations() {
  const { userId, error } = await getCurrentUserId();
  if (error) return { data: null, error };
  return supabase
    .from("user_favorites")
    .select("id,project_id,idea_id,created_at,projects(id,name,status,deleted_at),ideas(id,name,status,deleted_at,archived_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function findProjectFavorite(projectId) {
  const { userId, error } = await getCurrentUserId();
  if (error) return { data: null, error };
  return supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function findIdeaFavorite(ideaId) {
  const { userId, error } = await getCurrentUserId();
  if (error) return { data: null, error };
  return supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("idea_id", ideaId)
    .maybeSingle();
}

export function insertProjectFavorite(projectId) {
  return insertFavorite("project_id", projectId);
}

export function insertIdeaFavorite(ideaId) {
  return insertFavorite("idea_id", ideaId);
}

export function deleteProjectFavorite(projectId) {
  return deleteFavorite("project_id", projectId);
}

export function deleteIdeaFavorite(ideaId) {
  return deleteFavorite("idea_id", ideaId);
}
