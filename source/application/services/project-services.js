import { listProjectServiceDetails, listProjectToolRelations, findEcosystemToolBySlug, insertEcosystemTool, insertProjectToolRelation } from "../../infrastructure/supabase/projects-repository.js";

export async function getProjectServices(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  const result = await listProjectServiceDetails(projectId);
  return {
    services: result.services.data || [],
    resources: result.resources.data || [],
    error: result.services.error || result.resources.error || null
  };
}

export async function getProjectServicesSummary() {
  const result = await listProjectToolRelations();
  if (result.error) return { counts: {}, error: result.error };
  const counts = {};
  for (const relation of result.data || []) {
    if (relation.status !== "active") continue;
    counts[relation.project_id] = (counts[relation.project_id] || 0) + 1;
  }
  return { counts, error: null };
}

const SERVICE_CATEGORIES = new Set(["ai","development","domains_dns","database","hosting","analytics","payments","communication","other"]);
const RELATIONSHIP_TYPES = new Set(["manual_use","technical_integration","infrastructure_dependency","other"]);

function makeSlug(value) {
  const transliteration = {а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
  const normalized = String(value || "").toLowerCase().split("").map(char=>transliteration[char] ?? char).join("");
  const slug = normalized.normalize("NFKD").replace(/\p{M}/gu,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
  return slug || "service-" + crypto.randomUUID().slice(0,8);
}

export async function createProjectService(ownerId, projectId, values) {
  const name = String(values.name || "").trim();
  const category = String(values.category || "other");
  const officialUrl = String(values.official_url || "").trim();
  const purpose = String(values.purpose || "").trim();
  const relationshipType = String(values.relationship_type || "manual_use");
  if (!name || name.length > 120) throw new Error("Укажите название сервиса (до 120 символов).");
  if (!SERVICE_CATEGORIES.has(category)) throw new Error("Недопустимая категория сервиса.");
  if (!RELATIONSHIP_TYPES.has(relationshipType)) throw new Error("Недопустимый тип подключения.");
  if (officialUrl) {
    let parsed;
    try { parsed = new URL(officialUrl); } catch { throw new Error("Укажите корректную ссылку на сервис."); }
    if (!["http:","https:"].includes(parsed.protocol)) throw new Error("Ссылка должна использовать HTTP или HTTPS.");
  }

  const slug = makeSlug(name);
  const existing = await findEcosystemToolBySlug(ownerId,slug);
  if (existing.error) throw existing.error;
  let toolId = existing.data?.id;
  if (!toolId) {
    const created = await insertEcosystemTool({
      owner_id:ownerId,
      name,
      slug,
      category,
      description:"",
      official_url:officialUrl || null,
      status:"active"
    });
    if (created.error) throw created.error;
    toolId = created.data.id;
  }

  const relation = await insertProjectToolRelation({
    owner_id:ownerId,
    project_id:projectId,
    tool_id:toolId,
    relationship_type:relationshipType,
    purpose,
    status:"active"
  });
  if (relation.error) throw relation.error;
  return { toolId, relationId:relation.data.id };
}
