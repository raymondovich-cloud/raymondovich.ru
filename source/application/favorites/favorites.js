import {
  listFavoriteRelations,
  findProjectFavorite,
  findIdeaFavorite,
  insertProjectFavorite,
  insertIdeaFavorite,
  deleteProjectFavorite,
  deleteIdeaFavorite
} from "../../infrastructure/supabase/favorites-repository.js";

function normalizeFavorite(row) {
  if (row.project_id && row.projects && !row.projects.deleted_at) {
    return {
      id: row.project_id,
      favoriteId: row.id,
      type: "project",
      name: row.projects.name,
      status: row.projects.status,
      createdAt: row.created_at
    };
  }
  if (row.idea_id && row.ideas && !row.ideas.deleted_at) {
    return {
      id: row.idea_id,
      favoriteId: row.id,
      type: "idea",
      name: row.ideas.name,
      status: row.ideas.status,
      archivedAt: row.ideas.archived_at || null,
      createdAt: row.created_at
    };
  }
  return null;
}

export async function getFavorites() {
  const result = await listFavoriteRelations();
  if (result.error) return { data: [], error: result.error };
  return {
    data: (result.data || []).map(normalizeFavorite).filter(Boolean),
    error: null
  };
}

export async function isFavorite({ projectId = null, ideaId = null } = {}) {
  if (Boolean(projectId) === Boolean(ideaId)) {
    return { data: false, error: new Error("Укажите ровно один объект избранного.") };
  }
  const result = projectId
    ? await findProjectFavorite(projectId)
    : await findIdeaFavorite(ideaId);
  return { data: Boolean(result.data), error: result.error || null };
}

async function addFavorite(targetId, findExisting, insert) {
  if (!targetId) return { data: null, error: new Error("Не указан объект избранного.") };
  const existing = await findExisting(targetId);
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data) return { data: existing.data, error: null };
  const created = await insert(targetId);
  if (created.error?.code === "23505") {
    const confirmed = await findExisting(targetId);
    return { data: confirmed.data, error: confirmed.error || null };
  }
  return { data: created.data, error: created.error || null };
}

export async function addProjectToFavorites(projectId) {
  return addFavorite(projectId, findProjectFavorite, insertProjectFavorite);
}

export async function removeProjectFromFavorites(projectId) {
  if (!projectId) return { data: null, error: new Error("Не указан проект.") };
  return deleteProjectFavorite(projectId);
}

export async function addIdeaToFavorites(ideaId) {
  return addFavorite(ideaId, findIdeaFavorite, insertIdeaFavorite);
}

export async function removeIdeaFromFavorites(ideaId) {
  if (!ideaId) return { data: null, error: new Error("Не указана идея.") };
  return deleteIdeaFavorite(ideaId);
}
