import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectRecordFromIdea, buildProjectUpdate } from "../../source/domain/projects/project.js";

test("buildProjectRecordFromIdea creates an active project linked to its source idea", () => {
  assert.deepEqual(buildProjectRecordFromIdea({
    id: "idea-1",
    name: "  Project  ",
    description: " Description ",
    priority: "high",
  }, " owner-1 "), {
    owner_id: "owner-1",
    source_idea_id: "idea-1",
    name: "Project",
    description: "Description",
    goal: "",
    expected_revenue: null,
    estimated_cost: null,
    business_model: "",
    concept: "",
    additional_info: "",
    completion_criteria: "",
    status: "active",
    priority: "high",
  });
});

test("buildProjectRecordFromIdea rejects missing source or owner", () => {
  assert.throws(() => buildProjectRecordFromIdea({ id: "idea-1", name: "Project" }, ""), /владельца/);
  assert.throws(() => buildProjectRecordFromIdea({ name: "Project" }, "owner-1"), /исходной идеи/);
});

test("buildProjectUpdate validates state transitions and pinned flag", () => {
  const update = buildProjectUpdate({ status: "paused", is_pinned: true, priority: "critical" }, "2026-11-05T00:00:00.000Z");
  assert.deepEqual(update, { status: "paused", priority: "critical", is_pinned: true, updated_at: "2026-11-05T00:00:00.000Z" });
  assert.throws(() => buildProjectUpdate({ status: "unknown" }), /статус проекта/);
  assert.throws(() => buildProjectUpdate({ is_pinned: "yes" }), /логическим/);
});
