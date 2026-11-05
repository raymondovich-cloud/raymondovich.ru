import test from "node:test";
import assert from "node:assert/strict";
import { buildIdeaRecord, buildIdeaUpdate } from "../../source/domain/ideas/idea.js";

test("buildIdeaRecord trims and maps the idea draft", () => {
  assert.deepEqual(buildIdeaRecord({
    ownerId: " owner-1 ",
    title: "  New idea  ",
    description: "  Description  ",
    expectedRevenue: "1500",
    estimatedCost: "",
  }), {
    owner_id: "owner-1",
    name: "New idea",
    description: "Description",
    goal: "",
    expected_revenue: 1500,
    estimated_cost: null,
    business_model: "",
    concept: "",
    additional_info: "",
  });
});

test("buildIdeaRecord rejects missing owner and title", () => {
  assert.throws(() => buildIdeaRecord({ ownerId: "", title: "Title" }), /владельца/);
  assert.throws(() => buildIdeaRecord({ ownerId: "owner-1", title: " " }), /название/);
});

test("buildIdeaRecord rejects negative or non-finite amounts", () => {
  assert.throws(() => buildIdeaRecord({ ownerId: "owner-1", title: "Idea", expectedRevenue: -1 }), /неотрицательное число/);
  assert.throws(() => buildIdeaRecord({ ownerId: "owner-1", title: "Idea", estimatedCost: "NaN" }), /неотрицательное число/);
});

test("buildIdeaUpdate allow-lists fields and validates status and priority", () => {
  const update = buildIdeaUpdate({ status: "review", priority: "high", name: "  Updated  ", owner_id: "injected" }, "2026-11-05T00:00:00.000Z");
  assert.deepEqual(update, { name: "Updated", status: "review", priority: "high", updated_at: "2026-11-05T00:00:00.000Z" });
  assert.throws(() => buildIdeaUpdate({ status: "admin" }), /статус идеи/);
  assert.throws(() => buildIdeaUpdate({ priority: "urgent" }), /приоритет идеи/);
});
