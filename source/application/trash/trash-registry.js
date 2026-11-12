import { supabase } from "../../infrastructure/supabase/client.js";
import {
  listTrashedProjects,
  listTrashedIdeas,
  moveIdeaToTrash,
  restoreIdeaFromTrash,
  permanentlyDeleteTrashedIdea
} from "../../infrastructure/supabase/trash-repository.js";
import {
  restoreProjectFromTrash,
  permanentlyDeleteTrashedProject
} from "../../infrastructure/supabase/projects-repository.js";

function normalize(items,type) {
  return (items || []).map(item => ({
    id:item.id,
    name:item.name,
    type,
    deletedAt:item.deleted_at,
    status:item.status || null,
    archivedAt:item.archived_at || null,
    createdAt:item.created_at
  }));
}

export async function loadTrash() {
  const [projects,ideas]=await Promise.all([listTrashedProjects(),listTrashedIdeas()]);
  const error=projects.error || ideas.error || null;
  return {
    error,
    items:error?[]:[...normalize(projects.data,"project"),...normalize(ideas.data,"idea")]
      .sort((a,b)=>new Date(b.deletedAt)-new Date(a.deletedAt))
  };
}

export async function moveIdeaToTrashRecord(idea,userId) {
  if(!idea?.id || !userId) return {data:null,error:new Error("Не удалось определить идею или владельца.")};
  const moved=await moveIdeaToTrash(idea.id);
  if(moved.error) return moved;
  const activity=await supabase.from("idea_activity").insert({
    idea_id:idea.id,owner_id:userId,actor_id:userId,event_type:"moved_to_trash",
    details:{previous_status:idea.status,archived_at:idea.archived_at || null}
  });
  if(activity.error) {
    const rollback=await supabase.from("ideas").update({deleted_at:null}).eq("id",idea.id);
    return {data:null,error:rollback.error || activity.error};
  }
  return moved;
}

export async function restoreTrashItem(item,userId) {
  if(item.type==="project") return restoreProjectFromTrash(item.id);
  const result=await restoreIdeaFromTrash(item.id);
  if(result.error) return result;
  if(!userId) return {data:result.data,error:new Error("Объект восстановлен, но не удалось определить владельца для записи истории.")};
  const activity=await supabase.from("idea_activity").insert({
    idea_id:item.id,owner_id:userId,actor_id:userId,event_type:"restored_from_trash",
    details:{restored_status:result.data.status,archived_at:result.data.archived_at || null}
  });
  if(activity.error) return {data:result.data,error:activity.error};
  return result;
}

export async function permanentlyDeleteTrashItem(item) {
  if(item.type==="project") return permanentlyDeleteTrashedProject(item.id);
  return permanentlyDeleteTrashedIdea(item.id);
}
