// version 1.0
import { supabase } from "../client.js";

const IDEA_FIELDS = "id, owner_id, name, description, goal, expected_revenue, estimated_cost, business_model, concept, additional_info, status, priority, created_at, updated_at, launched_at";

export const ideaRepository = {
  async listByOwner(ownerId) {
    const { data, error } = await supabase.from("ideas").select(IDEA_FIELDS)
      .eq("owner_id", ownerId).order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(record) {
    const { data, error } = await supabase.from("ideas").insert(record).select(IDEA_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async update(id, ownerId, changes) {
    const { data, error } = await supabase.from("ideas").update(changes)
      .eq("id", id).eq("owner_id", ownerId).select(IDEA_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async delete(id, ownerId) {
    const { error } = await supabase.from("ideas").delete().eq("id", id).eq("owner_id", ownerId);
    if (error) throw error;
  },
};
