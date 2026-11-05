// version 2.0
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

    async createIdea({ ownerId, title, description = "", goal = "", expectedRevenue = null, estimatedCost = null, businessModel = "", concept = "", additionalInfo = "" }) {
      const name = String(title || "").trim();
      if (!name) throw new Error("Добавь короткое название идеи.");
      try {
        return await repository.create({
          owner_id: ownerId,
          name,
          description: description.trim(),
          goal: goal.trim(),
          expected_revenue: expectedRevenue,
          estimated_cost: estimatedCost,
          business_model: businessModel.trim(),
          concept: concept.trim(),
          additional_info: additionalInfo.trim(),
        });
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async updateIdea(id, ownerId, changes) {
      const allowed = {};
      for (const key of ["status", "priority", "name", "description", "goal", "expected_revenue", "estimated_cost", "business_model", "concept", "additional_info"]) {
        if (Object.hasOwn(changes, key)) allowed[key] = changes[key];
      }
      allowed.updated_at = new Date().toISOString();
      try {
        return await repository.update(id, ownerId, allowed);
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
