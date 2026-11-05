// version 3.0
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

        const project = await projectRepository.create({
          owner_id: ownerId,
          source_idea_id: idea.id,
          name: idea.name,
          description: idea.description || "",
          goal: idea.goal || "",
          expected_revenue: idea.expected_revenue ?? null,
          estimated_cost: idea.estimated_cost ?? null,
          business_model: idea.business_model || "",
          concept: idea.concept || "",
          additional_info: idea.additional_info || "",
          completion_criteria: "",
          status: "active",
          priority: idea.priority || "normal",
        });

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
      const allowed = {};
      for (const key of ["status", "priority", "is_pinned", "name", "description", "goal", "expected_revenue", "estimated_cost", "business_model", "concept", "additional_info"]) {
        if (Object.hasOwn(changes, key)) allowed[key] = changes[key];
      }
      allowed.updated_at = new Date().toISOString();
      try {
        return await projectRepository.update(id, ownerId, allowed);
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
