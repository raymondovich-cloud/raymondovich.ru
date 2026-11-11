import { countIdeasSummary } from "../../infrastructure/supabase/ideas-repository.js";

/** Public read-only Ideas contract for aggregate counts in owner surfaces. */
export async function getIdeasSummary(){
  const result=await countIdeasSummary();
  return {
    total:result.total,
    newCount:result.newCount,
    highPriorityCount:result.highPriorityCount,
    error:result.error||null
  };
}
