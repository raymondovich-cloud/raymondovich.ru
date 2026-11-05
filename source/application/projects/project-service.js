// version 4.0
import { buildProjectRecordFromIdea, buildProjectUpdate } from "../../domain/projects/project.js";

function normalizeError(error, fallback = "Не удалось выполнить операцию с проектом.") {
  if (!error) return new Error(fallback);
  return new Error(error.message || fallback);
}

export function createProjectService({ projectRepository, ideaRepository }) {
  return {
    async listProjects(ownerId) {
      try {
        return await projectRepository.listByOwner(ownerId);
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async createProjectFromIdea(idea, ownerId) {
      try {
        const existing = await projectRepository.findBySourceIdea(ownerId, idea.id);
        if (existing) {
          await ideaRepository.update(idea.id, ownerId, {
            status: "launched",
            launched_at: idea.launched_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          return existing;
        }

        let project;
        try {
          project = await projectRepository.create(buildProjectRecordFromIdea(idea, ownerId));
        } catch (error) {
          if (error.code !== "23505") throw error;

          const concurrentProject = await projectRepository.findBySourceIdea(ownerId, idea.id);
          if (!concurrentProject) throw error;

          await ideaRepository.update(idea.id, ownerId, {
            status: "launched",
            launched_at: idea.launched_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          return concurrentProject;
        }

        try {
          await ideaRepository.update(idea.id, ownerId, {
            status: "launched",
            launched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (error) {
          try {
            await projectRepository.delete(project.id, ownerId);
          } catch (rollbackError) {
            throw new Error(`Не удалось обновить исходную идею, а автоматическая отмена создания проекта также завершилась ошибкой: ${rollbackError.message || "ошибка удаления"}.`);
          }
          throw new Error(`Не удалось завершить запуск идеи. Создание проекта отменено. Причина: ${error.message || "ошибка обновления идеи"}`);
        }
        return project;
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async updateProject(id, ownerId, changes) {
      try {
        return await projectRepository.update(id, ownerId, buildProjectUpdate(changes));
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async deleteProject(id, ownerId) {
      let sourceIdeaId;
      try {
        sourceIdeaId = await projectRepository.findSourceIdeaId(id, ownerId);
        await projectRepository.delete(id, ownerId);
      } catch (error) {
        throw normalizeError(error);
      }

      if (sourceIdeaId) {
        try {
          await ideaRepository.update(sourceIdeaId, ownerId, {
            status: "review",
            launched_at: null,
            updated_at: new Date().toISOString(),
          });
        } catch (error) {
          throw normalizeError(error, "Проект удалён, но исходную идею не удалось вернуть на рассмотрение.");
        }
      }
    },
  };
}
