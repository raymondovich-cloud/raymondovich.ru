// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";
import { getRole, getSession } from "../auth/authentication.js";

async function assertAdmin() {
  const session = await getSession();
  if (!session || getRole(session) !== "admin") {
    throw new Error("Доступ разрешён только администратору.");
  }
  return session;
}

function fail(error) {
  if (error) throw new Error(error.message || "Не удалось выполнить операцию.");
}

export async function loadToolsInventory() {
  await assertAdmin();
  const [tools, resources, projects, toolRelations, resourceRelations] = await Promise.all([
    supabase.from("ecosystem_tools").select("*").order("name"),
    supabase.from("tool_resources").select("*").order("name"),
    supabase.from("projects").select("id,name,status").order("name"),
    supabase.from("project_tool_relations").select("*").order("created_at", { ascending: false }),
    supabase.from("project_resource_relations").select("*").order("created_at", { ascending: false }),
  ]);
  [tools, resources, projects, toolRelations, resourceRelations].forEach((result) => fail(result.error));
  return {
    tools: tools.data || [],
    resources: resources.data || [],
    projects: projects.data || [],
    toolRelations: toolRelations.data || [],
    resourceRelations: resourceRelations.data || [],
  };
}

export async function saveTool(input, id = null) {
  await assertAdmin();
  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    category: input.category,
    description: input.description.trim(),
    official_url: input.official_url.trim() || null,
    status: input.status,
  };
  const query = id
    ? supabase.from("ecosystem_tools").update(payload).eq("id", id)
    : supabase.from("ecosystem_tools").insert(payload);
  const { error } = await query;
  fail(error);
}

export async function deleteTool(id) {
  await assertAdmin();
  const { error } = await supabase.from("ecosystem_tools").delete().eq("id", id);
  fail(error);
}

export async function saveResource(input, id = null) {
  await assertAdmin();
  const payload = {
    tool_id: input.tool_id,
    name: input.name.trim(),
    resource_type: input.resource_type,
    resource_url: input.resource_url.trim() || null,
    external_id: input.external_id.trim() || null,
    environment: input.environment || null,
    status: input.status,
    description: input.description.trim(),
  };
  const query = id
    ? supabase.from("tool_resources").update(payload).eq("id", id)
    : supabase.from("tool_resources").insert(payload);
  const { error } = await query;
  fail(error);
}

export async function deleteResource(id) {
  await assertAdmin();
  const { error } = await supabase.from("tool_resources").delete().eq("id", id);
  fail(error);
}

export async function saveToolRelation(input) {
  await assertAdmin();
  const { error } = await supabase.from("project_tool_relations").upsert({
    project_id: input.project_id,
    tool_id: input.tool_id,
    relationship_type: input.relationship_type,
    purpose: input.purpose.trim(),
    status: input.status,
    evidence_note: input.evidence_note.trim(),
    last_verified_at: input.status === "needs_verification" ? null : new Date().toISOString(),
  }, { onConflict: "owner_id,project_id,tool_id,relationship_type" });
  fail(error);
}

export async function deleteToolRelation(id) {
  await assertAdmin();
  const { error } = await supabase.from("project_tool_relations").delete().eq("id", id);
  fail(error);
}

export async function saveResourceRelation(input) {
  await assertAdmin();
  const { error } = await supabase.from("project_resource_relations").upsert({
    project_id: input.project_id,
    resource_id: input.resource_id,
    role: input.role.trim(),
    status: input.status,
    evidence_note: input.evidence_note.trim(),
    last_verified_at: input.status === "needs_verification" ? null : new Date().toISOString(),
  }, { onConflict: "owner_id,project_id,resource_id" });
  fail(error);
}

export async function deleteResourceRelation(id) {
  await assertAdmin();
  const { error } = await supabase.from("project_resource_relations").delete().eq("id", id);
  fail(error);
}
