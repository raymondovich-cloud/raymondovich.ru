import test from "node:test";
import assert from "node:assert/strict";
import { createIdeaService } from "../../source/application/ideas/idea-service.js";

function createRepository(overrides = {}) {
  const calls = [];
  return {
    calls,
    async listByOwner(ownerId) { calls.push(["listByOwner", ownerId]); return [{ id: "idea-1" }]; },
    async create(record) { calls.push(["create", record]); return { id: "idea-1", ...record }; },
    async update(id, ownerId, changes) { calls.push(["update", id, ownerId, changes]); return { id, ...changes }; },
    async delete(id, ownerId) { calls.push(["delete", id, ownerId]); },
    ...overrides,
  };
}

test("listIdeas delegates owner-scoped retrieval to the repository", async () => {
  const repository = createRepository();
  const service = createIdeaService({ repository });
  assert.deepEqual(await service.listIdeas("owner-1"), [{ id: "idea-1" }]);
  assert.deepEqual(repository.calls, [["listByOwner", "owner-1"]]);
});

test("createIdea trims text and maps application fields to persistence fields", async () => {
  const repository = createRepository();
  const service = createIdeaService({ repository });
  const result = await service.createIdea({
    ownerId: "owner-1",
    title: "  New direction  ",
    description: "  context  ",
    goal: "  goal  ",
    businessModel: "  subscription  ",
    concept: "  concept  ",
    additionalInfo: "  note  ",
    expectedRevenue: 1200,
    estimatedCost: 300,
  });
  assert.equal(result.name, "New direction");
  assert.equal(result.description, "context");
  assert.equal(result.goal, "goal");
  assert.equal(result.business_model, "subscription");
  assert.equal(result.concept, "concept");
  assert.equal(result.additional_info, "note");
  assert.equal(result.owner_id, "owner-1");
  assert.equal(result.expected_revenue, 1200);
  assert.equal(result.estimated_cost, 300);
});

test("createIdea rejects an empty title without writing", async () => {
  const repository = createRepository();
  const service = createIdeaService({ repository });
  await assert.rejects(() => service.createIdea({ ownerId: "owner-1", title: "  " }), /название идеи/i);
  assert.equal(repository.calls.length, 0);
});

test("updateIdea allows only declared fields and adds updated_at", async () => {
  const repository = createRepository();
  const service = createIdeaService({ repository });
  const result = await service.updateIdea("idea-1", "owner-1", {
    status: "review",
    priority: "high",
    owner_id: "attacker",
    unexpected: true,
  });
  assert.equal(result.status, "review");
  assert.equal(result.priority, "high");
  assert.equal(result.owner_id, undefined);
  assert.equal(result.unexpected, undefined);
  assert.ok(Number.isFinite(Date.parse(result.updated_at)));
});

test("deleteIdea delegates owner-scoped deletion", async () => {
  const repository = createRepository();
  const service = createIdeaService({ repository });
  await service.deleteIdea("idea-1", "owner-1");
  assert.deepEqual(repository.calls, [["delete", "idea-1", "owner-1"]]);
});

test("repository failures are normalized to application errors", async () => {
  const repository = createRepository({
    async listByOwner() { throw new Error("database unavailable"); },
  });
  const service = createIdeaService({ repository });
  await assert.rejects(() => service.listIdeas("owner-1"), /database unavailable/);
});
