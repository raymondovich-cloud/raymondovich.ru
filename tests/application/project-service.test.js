import test from "node:test";
import assert from "node:assert/strict";
import { createProjectService } from "../../source/application/projects/project-service.js";

function createRepositories({ existing = null, existingAfterConflict = undefined, createError = null, ideaUpdateError = null, deleteError = null } = {}) {
  const calls = [];
  let sourceLookupCount = 0;
  const projectRepository = {
    async listByOwner(ownerId) { calls.push(["list", ownerId]); return []; },
    async findBySourceIdea(ownerId, ideaId) {
      calls.push(["findBySourceIdea", ownerId, ideaId]);
      sourceLookupCount += 1;
      return sourceLookupCount === 1 ? existing : (existingAfterConflict ?? existing);
    },
    async create(record) {
      calls.push(["create", record]);
      if (createError) throw createError;
      return { id: "project-1", ...record };
    },
    async update(id, ownerId, changes) { calls.push(["updateProject", id, ownerId, changes]); return { id, ...changes }; },
    async findSourceIdeaId(id, ownerId) { calls.push(["findSourceIdeaId", id, ownerId]); return "idea-1"; },
    async delete(id, ownerId) {
      calls.push(["deleteProject", id, ownerId]);
      if (deleteError) throw deleteError;
    },
  };
  const ideaRepository = {
    async update(id, ownerId, changes) {
      calls.push(["updateIdea", id, ownerId, changes]);
      if (ideaUpdateError) throw ideaUpdateError;
      return { id, ...changes };
    },
  };
  return { calls, projectRepository, ideaRepository };
}

const sourceIdea = {
  id: "idea-1",
  name: "Project from idea",
  description: "Description",
  goal: "Goal",
  expected_revenue: 5000,
  estimated_cost: 1000,
  business_model: "Subscription",
  concept: "Concept",
  additional_info: "Notes",
  priority: "high",
};

test("listProjects delegates owner-scoped retrieval", async () => {
  const repos = createRepositories();
  const service = createProjectService(repos);
  assert.deepEqual(await service.listProjects("owner-1"), []);
  assert.deepEqual(repos.calls, [["list", "owner-1"]]);
});

test("createProjectFromIdea creates a project and marks its source idea as launched", async () => {
  const repos = createRepositories();
  const service = createProjectService(repos);
  const project = await service.createProjectFromIdea(sourceIdea, "owner-1");
  assert.equal(project.name, sourceIdea.name);
  assert.equal(project.owner_id, "owner-1");
  assert.equal(project.source_idea_id, "idea-1");
  assert.equal(project.status, "active");
  const ideaUpdate = repos.calls.find(([name]) => name === "updateIdea");
  assert.equal(ideaUpdate[3].status, "launched");
  assert.ok(Number.isFinite(Date.parse(ideaUpdate[3].launched_at)));
});

test("createProjectFromIdea reuses an existing project and synchronizes the idea", async () => {
  const existing = { id: "project-existing", source_idea_id: "idea-1" };
  const repos = createRepositories({ existing });
  const service = createProjectService(repos);
  assert.equal(await service.createProjectFromIdea(sourceIdea, "owner-1"), existing);
  assert.equal(repos.calls.some(([name]) => name === "create"), false);
  assert.equal(repos.calls.find(([name]) => name === "updateIdea")[3].status, "launched");
});

test("createProjectFromIdea treats a concurrent unique-source conflict as an idempotent success", async () => {
  const duplicateError = Object.assign(new Error("duplicate source_idea_id"), { code: "23505" });
  const existingAfterConflict = { id: "project-created-by-concurrent-request", source_idea_id: "idea-1" };
  const repos = createRepositories({ createError: duplicateError, existingAfterConflict });
  const service = createProjectService(repos);

  const result = await service.createProjectFromIdea(sourceIdea, "owner-1");

  assert.equal(result, existingAfterConflict);
  assert.equal(repos.calls.filter(([name]) => name === "findBySourceIdea").length, 2);
  assert.equal(repos.calls.some(([name]) => name === "deleteProject"), false);
  assert.equal(repos.calls.find(([name]) => name === "updateIdea")[3].status, "launched");
});

test("createProjectFromIdea rolls back a newly created project when idea update fails", async () => {
  const repos = createRepositories({ ideaUpdateError: new Error("idea write failed") });
  const service = createProjectService(repos);
  await assert.rejects(() => service.createProjectFromIdea(sourceIdea, "owner-1"), /Создание проекта отменено/i);
  assert.ok(repos.calls.some(([name, id]) => name === "deleteProject" && id === "project-1"));
});

test("createProjectFromIdea reports both failures when rollback also fails", async () => {
  const repos = createRepositories({
    ideaUpdateError: new Error("idea write failed"),
    deleteError: new Error("rollback failed"),
  });
  const service = createProjectService(repos);
  await assert.rejects(() => service.createProjectFromIdea(sourceIdea, "owner-1"), /автоматическая отмена.*rollback failed/i);
});

test("updateProject filters fields before calling the repository", async () => {
  const repos = createRepositories();
  const service = createProjectService(repos);
  const result = await service.updateProject("project-1", "owner-1", {
    status: "paused",
    is_pinned: true,
    owner_id: "attacker",
    unexpected: "value",
  });
  assert.equal(result.status, "paused");
  assert.equal(result.is_pinned, true);
  assert.equal(result.owner_id, undefined);
  assert.equal(result.unexpected, undefined);
  assert.ok(Number.isFinite(Date.parse(result.updated_at)));
});

test("deleteProject deletes the project and restores its source idea for review", async () => {
  const repos = createRepositories();
  const service = createProjectService(repos);
  await service.deleteProject("project-1", "owner-1");
  const deleteIndex = repos.calls.findIndex(([name]) => name === "deleteProject");
  const restoreIndex = repos.calls.findIndex(([name]) => name === "updateIdea");
  assert.ok(deleteIndex >= 0 && restoreIndex > deleteIndex);
  assert.equal(repos.calls[restoreIndex][3].status, "review");
  assert.equal(repos.calls[restoreIndex][3].launched_at, null);
});

test("deleteProject reports that deletion succeeded when source-idea restoration fails", async () => {
  const repos = createRepositories({ ideaUpdateError: new Error("restore denied") });
  const service = createProjectService(repos);

  await assert.rejects(
    () => service.deleteProject("project-1", "owner-1"),
    /Проект удалён, но исходную идею не удалось вернуть на рассмотрение\. Причина: restore denied/,
  );
  const deleteIndex = repos.calls.findIndex(([name]) => name === "deleteProject");
  const restoreIndex = repos.calls.findIndex(([name]) => name === "updateIdea");
  assert.ok(deleteIndex >= 0 && restoreIndex > deleteIndex);
});

test("deleteProject stops when the project deletion fails", async () => {
  const repos = createRepositories({ deleteError: new Error("delete failed") });
  const service = createProjectService(repos);
  await assert.rejects(() => service.deleteProject("project-1", "owner-1"), /delete failed/);
  assert.equal(repos.calls.some(([name]) => name === "updateIdea"), false);
});
