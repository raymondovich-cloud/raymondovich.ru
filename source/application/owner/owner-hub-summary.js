import { getProjectsSummary } from "../projects/project-registry.js";
import { getIdeasSummary } from "../ideas/ideas-summary.js";

/** Composes only public module contracts; no repository or table access here. */
export async function getOwnerHubSummary(){
  const [projectsResult,ideasResult]=await Promise.allSettled([
    getProjectsSummary(),
    getIdeasSummary()
  ]);
  const projects=projectsResult.status==="fulfilled"&&!projectsResult.value.error
    ? {total:projectsResult.value.total,activeCount:projectsResult.value.activeCount}
    : null;
  const ideas=ideasResult.status==="fulfilled"&&!ideasResult.value.error
    ? {total:ideasResult.value.total,newCount:ideasResult.value.newCount,highPriorityCount:ideasResult.value.highPriorityCount}
    : null;
  return {
    projects,
    ideas,
    errors:{
      projects:projects?null:(projectsResult.status==="rejected"?projectsResult.reason?.message:projectsResult.value?.error?.message)||"Не удалось получить данные",
      ideas:ideas?null:(ideasResult.status==="rejected"?ideasResult.reason?.message:ideasResult.value?.error?.message)||"Не удалось получить данные"
    }
  };
}
