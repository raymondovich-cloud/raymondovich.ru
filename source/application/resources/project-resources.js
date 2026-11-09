import { listProjectResources, insertToolResource, insertProjectResourceRelation } from "../../infrastructure/supabase/projects-repository.js";
const TYPES=new Set(["repository","domain","database","server","api","deployment","dns_zone","supabase_project","other"]);
const ENVS=new Set(["production","staging","development",""]);
const STATUSES=new Set(["active","testing","paused","retired","unknown","needs_verification"]);
function safeUrl(value){if(!value)return null;let url;try{url=new URL(value)}catch{throw new Error("Укажите корректную ссылку на ресурс.")}if(!["http:","https:"].includes(url.protocol))throw new Error("Ссылка должна использовать HTTP или HTTPS.");return url.href}
export async function getProjectResources(projectId){if(!projectId)throw new Error("Project context is required.");const result=await listProjectResources(projectId);if(result.error)throw result.error;return result.data||[]}
export async function createProjectResource(ownerId,projectId,values){
const name=String(values.name||"").trim(),toolId=String(values.tool_id||""),type=String(values.resource_type||"other"),environment=String(values.environment||""),status=String(values.status||"needs_verification"),role=String(values.role||"").trim(),description=String(values.description||"").trim(),url=safeUrl(String(values.resource_url||"").trim());
if(!name||name.length>160)throw new Error("Укажите название ресурса (до 160 символов).");
if(!toolId)throw new Error("Выберите сервис-провайдер для ресурса.");
if(!TYPES.has(type)||!ENVS.has(environment)||!STATUSES.has(status))throw new Error("Проверьте тип, окружение и статус ресурса.");
if(role.length>500||description.length>2000)throw new Error("Слишком длинное описание.");
const resource=await insertToolResource({owner_id:ownerId,tool_id:toolId,name,resource_type:type,resource_url:url,environment:environment||null,status,description});
if(resource.error)throw resource.error;
const relation=await insertProjectResourceRelation({owner_id:ownerId,project_id:projectId,resource_id:resource.data.id,role,status:status==="active"?"active":status==="paused"?"paused":"needs_verification"});
if(relation.error)throw relation.error;
return {resourceId:resource.data.id,relationId:relation.data.id};
}