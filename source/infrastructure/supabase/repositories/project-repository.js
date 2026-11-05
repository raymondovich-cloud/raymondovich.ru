// version 1.0
import { supabase } from "../client.js";

const PROJECT_FIELDS = "id, owner_id, source_idea_id, name, description, goal, expected_revenue, estimated_cost, business_model, concept, additional_info, status, priority, target_start_date, target_due_date, created_at, updated_at, is_pinned";

export const projectRepository = {
  async listByOwner(ownerId) {
    const { data, error } = await supabase.from("projects").select(PROJECT_FIELDS)
      .eq("owner_id", ownerId).order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findBySourceIdea(ownerId, ideaId) {
    const { data, error } = await supabase.from("projects").select(PROJECT_FIELDS)
      .eq("owner_id", ownerId).eq("source_idea_id", ideaId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(record) {
    const { data, error } = await supabase.from("projects").insert(record).select(PROJECT_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async update(id, ownerId, changes) {
    const { data, error } = await supabase.from("projects").update(changes)
      .eq("id", id).eq("owner_id", ownerId).select(PROJECT_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async findSourceIdeaId(id, ownerId) {
    const { data, error } = await supabase.from("projects").select("source_idea_id")
      .eq("id", id).eq("owner_id", ownerId).single();
    if (error) throw error;
    return data?.source_idea_id || null;
  },

  async delete(id, ownerId) {
    const { error } = await supabase.from("projects").delete().eq("id", id).eq("owner_id", ownerId);
    if (error) throw error;
  },
};
