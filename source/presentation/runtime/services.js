import { ideaRepository } from "../../infrastructure/supabase/repositories/idea-repository.js";
import { projectRepository } from "../../infrastructure/supabase/repositories/project-repository.js";
import { createIdeaService } from "../../application/ideas/idea-service.js";
import { createProjectService } from "../../application/projects/project-service.js";

const ideas = createIdeaService({ repository: ideaRepository });
const projects = createProjectService({
  projectRepository,
  ideaRepository,
});

export const { listIdeas, createIdea, updateIdea, deleteIdea } = ideas;
export const { listProjects, createProjectFromIdea, updateProject, deleteProject } = projects;
