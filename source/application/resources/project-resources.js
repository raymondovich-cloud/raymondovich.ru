import { listProjectResources, insertToolResource, insertProjectResourceRelation, updateToolResource, updateProjectResourceRelation, deleteProjectResourceRelation, findEcosystemToolBySlug, insertEcosystemTool } from "../../infrastructure/supabase/projects-repository.js";
const TYPES=new Set(["repository","domain","database","server","api","deployment","dns_zone","supabase_project","other"]);
const ENVS=new Set(["production","staging","development",""]);
const STATUSES=new Set(["active","testing","paused","retired","unknown","needs_verification"]);
function providerSlug(value){
 const map={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
 const normalized=String(value||"").toLowerCase().split("").map(char=>map[char]??char).join("").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
 return normalized||"provider-"+crypto.randomUUID().slice(0,8);
}
async function resolveProviderId(ownerId,value){
 const name=String(value||"").trim();
 if(!name||name.length>120)throw new Error("Укажите провайдера ресурса (до 120 символов).");
 const slug=providerSlug(name);
 const existing=await findEcosystemToolBySlug(ownerId,slug);
 if(existing.error)throw existing.error;
 if(existing.data)return existing.data.id;
 const created=await insertEcosystemTool({owner_id:ownerId,name,slug,category:"other",description:"",official_url:null,status:"active"});
 if(created.error)throw created.error;
 return created.data.id;
}
function safeUrl(value){if(!value)return null;let url;try{url=new URL(value)}catch{throw new Error("Укажите корректную ссылку на ресурс.")}if(!["http:","https:"].includes(url.protocol))throw new Error("Ссылка должна использовать HTTP или HTTPS.");return url.href}
export async function getProjectResources(projectId){if(!projectId)throw new Error("Project context is required.");const result=await listProjectResources(projectId);if(result.error)throw result.error;return result.data||[]}
export async function createProjectResource(ownerId,projectId,values){
 const name=String(values.name||"").trim(),providerName=String(values.provider_name||""),type=String(values.resource_type||"other"),environment=String(values.environment||""),status="needs_verification",role=String(values.role||"").trim(),description=String(values.description||"").trim(),url=safeUrl(String(values.resource_url||"").trim()),cost=Number(values.monthly_cost||0),date=String(values.next_payment_date||"");
 if(!name||name.length>160)throw new Error("Укажите название ресурса (до 160 символов).");
 if(!TYPES.has(type)||!ENVS.has(environment))throw new Error("Проверьте тип ресурса и окружение.");
 if(!Number.isFinite(cost)||cost<0||cost>1000000000)throw new Error("Укажите корректные ежемесячные расходы.");
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Укажите корректную дату следующей оплаты.");
 if(role.length>500||description.length>2000)throw new Error("Слишком длинное описание.");
 const finance={monthly_cost:cost,currency:"RUB",next_payment_date:date||null};
 const toolId=await resolveProviderId(ownerId,providerName);
 const resource=await insertToolResource({owner_id:ownerId,tool_id:toolId,name,resource_type:type,resource_url:url,environment:environment||null,status,description});
 if(resource.error)throw resource.error;
 const relation=await insertProjectResourceRelation({owner_id:ownerId,project_id:projectId,resource_id:resource.data.id,role,status:"needs_verification",dependency_level:"critical",...finance});
 if(relation.error)throw relation.error;
 return {resourceId:resource.data.id,relationId:relation.data.id};
}
export async function updateProjectResource(relationId,resourceId,ownerId,values){
 const name=String(values.name||"").trim(),providerName=String(values.provider_name||""),type=String(values.resource_type||"other"),environment=String(values.environment||""),role=String(values.role||"").trim(),description=String(values.description||"").trim(),url=safeUrl(String(values.resource_url||"").trim()),cost=Number(values.monthly_cost||0),date=String(values.next_payment_date||"");
 if(!name||name.length>160)throw new Error("Укажите название ресурса (до 160 символов).");
 if(!TYPES.has(type)||!ENVS.has(environment))throw new Error("Проверьте тип ресурса и окружение.");
 if(!Number.isFinite(cost)||cost<0||cost>1000000000)throw new Error("Укажите корректные ежемесячные расходы.");
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Укажите корректную дату следующей оплаты.");
 if(role.length>500||description.length>2000)throw new Error("Слишком длинное описание.");
 const toolId=await resolveProviderId(ownerId,providerName);
 const resource=await updateToolResource(resourceId,{tool_id:toolId,name,resource_type:type,resource_url:url,environment:environment||null,description});
 if(resource.error)throw resource.error;
 const relation=await updateProjectResourceRelation(relationId,{role,dependency_level:"critical",monthly_cost:cost,currency:"RUB",next_payment_date:date||null});
 if(relation.error)throw relation.error;
 return relation.data;
}
export async function removeProjectResource(relationId){const result=await deleteProjectResourceRelation(relationId);if(result.error)throw result.error;return result.data;}
