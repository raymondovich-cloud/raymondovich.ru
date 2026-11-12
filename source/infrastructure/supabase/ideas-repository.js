import { supabase } from "./client.js";

export async function countIdeasSummary(){
  const activeIdeas=()=>supabase.from("ideas").select("id",{count:"exact",head:true}).neq("status","archived").is("archived_at",null).is("deleted_at",null);
  const [total,newIdeas,highPriority]=await Promise.all([
    activeIdeas(),
    activeIdeas().eq("status","new"),
    activeIdeas().in("priority",["high","critical"])
  ]);
  return {
    total:total.count||0,
    newCount:newIdeas.count||0,
    highPriorityCount:highPriority.count||0,
    error:total.error||newIdeas.error||highPriority.error||null
  };
}
