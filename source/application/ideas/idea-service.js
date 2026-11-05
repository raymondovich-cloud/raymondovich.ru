// version 3.0
import { buildIdeaRecord, buildIdeaUpdate } from "../../domain/ideas/idea.js";

function normalizeError(error, fallback = "Не удалось выполнить операцию с идеей.") {
  if (!error) return new Error(fallback);
  return new Error(error.message || fallback);
}

export function createIdeaService({ repository }) {
  return {
    async listIdeas(ownerId) {
      try {
        return await repository.listByOwner(ownerId);
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async createIdea(input) {
      try {
        return await repository.create(buildIdeaRecord(input));
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async updateIdea(id, ownerId, changes) {
      try {
        return await repository.update(id, ownerId, buildIdeaUpdate(changes));
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async deleteIdea(id, ownerId) {
      try {
        await repository.delete(id, ownerId);
      } catch (error) {
        throw normalizeError(error);
      }
    },
  };
}
