import { loadProjectsRegistry } from "./project-registry.js";
import { getProjectServicesSummary } from "../services/project-services.js";
import { getProjectAccountingSummary } from "../accounting/project-accounting.js";
import { getProjectAnalyticsSummary } from "../analytics/project-analytics.js";
import { getProjectMarketingSummary } from "../marketing/project-marketing.js";

const notConfigured=()=>({state:"not_configured",value:null,currency:null,period:null,source:null,basis:null});

function buildServicesExpense(summary){
  if(!summary?.connectedCount)return notConfigured();
  return {
    state:"value",
    value:summary.monthlyCost,
    currency:summary.monthlyCost.length===1?summary.monthlyCost[0].currency:null,
    period:"month",
    source:"services_recurring",
    basis:"manual_estimate"
  };
}

/** Composes public module contracts only. */
export async function loadProjectsWorkspace(){
  const registry=await loadProjectsRegistry();
  if(registry.error)return {...registry,moduleSummaries:{}};
  let services={byProjectId:{},error:null};
  try{services=await getProjectServicesSummary();}
  catch(error){services={byProjectId:{},error};}
  const summaries=await Promise.all(registry.projects.map(async project=>{
    const [financeResult,insightsResult,promotionResult]=await Promise.allSettled([
      getProjectAccountingSummary(project.id),
      getProjectAnalyticsSummary(project.id),
      getProjectMarketingSummary(project.id)
    ]);
    const finance=financeResult.status==="fulfilled"?financeResult.value:{state:"error",label:"Нет данных"};
    const insights=insightsResult.status==="fulfilled"?insightsResult.value:{state:"error",label:"Нет данных"};
    const promotion=promotionResult.status==="fulfilled"?promotionResult.value:{state:"error",label:"Нет данных"};
    const serviceDto=services.byProjectId?.[project.id]||{connectedCount:0,servicesCount:0,resourcesCount:0,monthlyCost:[],hasPaid:false};
    const serviceError=Boolean(services.error);
    const expense=finance?.state==="value"?finance:(!serviceError?buildServicesExpense(serviceDto):notConfigured());
    return [project.id,{
      services:{
        ...serviceDto,
        count:serviceDto.connectedCount,
        label:serviceError?"Нет данных":serviceDto.connectedCount?serviceDto.connectedCount+" подключено":"Нет подключённых сервисов"
      },
      accounting:finance,
      analytics:insights,
      marketing:promotion,
      headline:{users:notConfigured(),income:notConfigured(),expense}
    }];
  }));
  return {projects:registry.projects,error:null,moduleSummaries:Object.fromEntries(summaries),serviceSummaryError:services.error||null};
}
