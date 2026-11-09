import { listProjectServiceDetails, listProjectServiceSummaryRelations, listProjectResourceSummaryRelations, findEcosystemToolBySlug, insertEcosystemTool, insertProjectToolRelation, updateProjectToolRelation, deleteProjectToolRelation, updateEcosystemTool } from "../../infrastructure/supabase/projects-repository.js";

const CATEGORIES=new Set(["ai","development","domains_dns","database","hosting","analytics","payments","communication","other"]);
const DEPENDENCIES=new Set(["critical","optional"]);
const RELATIONSHIP_TYPES=new Set(["manual_use","technical_integration","infrastructure_dependency","other"]);
function slugify(value){
  const map={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
  const text=String(value||"").toLowerCase().split("").map(c=>map[c]??c).join("");
  return text.normalize("NFKD").replace(/\p{M}/gu,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"service-"+crypto.randomUUID().slice(0,8);
}
function validateMoneyAndDate(values){
  const cost=Number(values.monthly_cost||0);
  if(!Number.isFinite(cost)||cost<0||cost>1000000000)throw new Error("Укажите корректные ежемесячные расходы.");
  const date=String(values.next_payment_date||"");
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Укажите корректную дату следующей оплаты.");
  return {monthly_cost:cost,currency:"RUB",next_payment_date:date||null};
}
function validateUrl(value,label){
  if(!value)return null;
  let parsed;try{parsed=new URL(value)}catch{throw new Error("Укажите корректную ссылку: "+label+".")}
  if(!["http:","https:"].includes(parsed.protocol))throw new Error("Ссылка должна использовать HTTP или HTTPS.");
  return parsed.href;
}
const INACTIVE_RELATION_STATUSES = new Set(["retired","paused"]);

/** A relation is connected unless explicitly retired or paused. */
export function isProjectServiceConnected(relation){
  return !INACTIVE_RELATION_STATUSES.has(relation?.status);
}

export async function getProjectServices(projectId){
  if(!projectId)throw new Error("Project context is required.");
  const result=await listProjectServiceDetails(projectId);
  const services=result.services.data||[],resources=result.resources.data||[];
  return {
    services:services.map(row=>({...row,connected:isProjectServiceConnected(row)})),
    resources:resources.map(row=>({...row,connected:isProjectServiceConnected(row)})),
    connectedServices:services.filter(isProjectServiceConnected),
    connectedResources:resources.filter(isProjectServiceConnected),
    error:result.services.error||result.resources.error||null
  };
}

export function aggregateProjectServicesSummary(serviceRelations=[],resourceRelations=[]){
  const summaries={};
  const add=(row,type)=>{
    if(!isProjectServiceConnected(row)||!row.project_id)return;
    const summary=summaries[row.project_id]||(summaries[row.project_id]={connectedCount:0,servicesCount:0,resourcesCount:0,monthlyCost:[],hasPaid:false});
    summary.connectedCount+=1;
    if(type==="service")summary.servicesCount+=1;else summary.resourcesCount+=1;
    const amount=Number(row.monthly_cost||0);
    if(Number.isFinite(amount)&&amount>0)summary.hasPaid=true;
    const currency=String(row.currency||"RUB").toUpperCase();
    const existing=summary.monthlyCost.find(item=>item.currency===currency);
    if(existing)existing.amount+=Number.isFinite(amount)?amount:0;
    else summary.monthlyCost.push({currency,amount:Number.isFinite(amount)?amount:0});
  };
  serviceRelations.forEach(row=>add(row,"service"));
  resourceRelations.forEach(row=>add(row,"resource"));
  Object.values(summaries).forEach(summary=>summary.monthlyCost.sort((a,b)=>a.currency.localeCompare(b.currency)));
  return summaries;
}

export async function getProjectServicesSummary(){
  const [services,resources]=await Promise.all([listProjectServiceSummaryRelations(),listProjectResourceSummaryRelations()]);
  const error=services.error||resources.error||null;
  if(error)return {byProjectId:{},error};
  return {byProjectId:aggregateProjectServicesSummary(services.data||[],resources.data||[]),error:null};
}
export async function createProjectService(ownerId,projectId,values){
  const name=String(values.name||"").trim(),category=String(values.category||"other"),dependency=String(values.dependency_level||"optional"),relationship=dependency==="critical"?"infrastructure_dependency":"manual_use";
  if(!name||name.length>120)throw new Error("Укажите название сервиса (до 120 символов).");
  if(!CATEGORIES.has(category)||!DEPENDENCIES.has(dependency))throw new Error("Проверьте категорию и тип зависимости.");
  const officialUrl=validateUrl(String(values.official_url||"").trim(),"официальный сайт");
  const finance=validateMoneyAndDate(values);
  const slug=slugify(name);
  const existing=await findEcosystemToolBySlug(ownerId,slug);
  if(existing.error)throw existing.error;
  let toolId=existing.data?.id;
  if(!toolId){
    const created=await insertEcosystemTool({owner_id:ownerId,name,slug,category,description:"",official_url:officialUrl,status:"active"});
    if(created.error)throw created.error;toolId=created.data.id;
  }
  const relation=await insertProjectToolRelation({owner_id:ownerId,project_id:projectId,tool_id:toolId,relationship_type:relationship,purpose:String(values.purpose||"").trim(),status:"active",dependency_level:dependency,...finance});
  if(relation.error)throw relation.error;
  return {toolId,relationId:relation.data.id};
}

export async function updateProjectService(relationId,toolId,values){
 const name=String(values.name||"").trim(),category=String(values.category||"other"),dependency=String(values.dependency_level||"optional");
 if(!name||name.length>120)throw new Error("Укажите название сервиса (до 120 символов).");
 if(!CATEGORIES.has(category)||!DEPENDENCIES.has(dependency))throw new Error("Проверьте категорию и тип зависимости.");
 const officialUrl=validateUrl(String(values.official_url||"").trim(),"официальный сайт");
 const finance=validateMoneyAndDate(values);
 const tool=await updateEcosystemTool(toolId,{name,category,official_url:officialUrl});
 if(tool.error)throw tool.error;
 const relation=await updateProjectToolRelation(relationId,{relationship_type:dependency==="critical"?"infrastructure_dependency":"manual_use",purpose:String(values.purpose||"").trim(),dependency_level:dependency,...finance});
 if(relation.error)throw relation.error;
 return relation.data;
}
export async function removeProjectService(relationId){const result=await deleteProjectToolRelation(relationId);if(result.error)throw result.error;return result.data;}
