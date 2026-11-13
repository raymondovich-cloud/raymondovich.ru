// @file-version: 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { assertToolDefinition } from "../../../source/domain/tools/tool-contract.js";
import { createToolRegistry } from "../../../source/domain/tools/tool-registry.js";

const validTool = {
  id: "ai-developer",
  name: "AI-разработчик",
  description: "Инструмент для помощи в разработке программных продуктов.",
  category: "development-tools",
  version: "1.0.0",
  visibility: "catalog",
  availability: "available",
  capabilities: ["code-generation", "code-review"],
  routes: ["tools/ai-developer"],
  integrationKey: "ai-developer",
};

test("validates and freezes a tool definition", () => {
  const tool = assertToolDefinition(validTool);
  assert.equal(tool.id, validTool.id);
  assert.equal(Object.isFrozen(tool), true);
  assert.equal(Object.isFrozen(tool.capabilities), true);
  assert.equal(Object.isFrozen(tool.routes), true);
  assert.throws(() => { tool.name = "Changed"; }, TypeError);
});

test("rejects invalid identifiers and unsupported states", () => {
  assert.throws(() => assertToolDefinition({ ...validTool, id: "AI Developer" }), /invalid id/i);
  assert.throws(() => assertToolDefinition({ ...validTool, visibility: "private" }), /visibility/i);
  assert.throws(() => assertToolDefinition({ ...validTool, availability: "paused" }), /availability/i);
});

test("rejects duplicate capabilities and malformed routes", () => {
  assert.throws(() => assertToolDefinition({
    ...validTool,
    capabilities: ["code-review", "code-review"],
  }), /duplicate capabilities/i);
  assert.throws(() => assertToolDefinition({
    ...validTool,
    routes: ["Tools/AI"],
  }), /routes item/i);
});

test("registry rejects duplicate ids and non-array input", () => {
  assert.throws(() => createToolRegistry({}), /must be an array/i);
  assert.throws(() => createToolRegistry([validTool, validTool]), /duplicate tool id/i);
});

test("registry isolates definitions and filters hidden tools by default", () => {
  const registry = createToolRegistry([
    validTool,
    { ...validTool, id: "internal-diagnostics", visibility: "hidden" },
  ]);

  assert.equal(registry.size, 2);
  assert.equal(registry.has("ai-developer"), true);
  assert.equal(registry.get("missing"), null);
  assert.deepEqual(registry.list().map((tool) => tool.id), ["ai-developer"]);
  assert.deepEqual(
    registry.list({ includeHidden: true }).map((tool) => tool.id),
    ["ai-developer", "internal-diagnostics"],
  );
  assert.equal(Object.isFrozen(registry), true);
});

test("empty production registry is a valid initial state", () => {
  const registry = createToolRegistry();
  assert.equal(registry.size, 0);
  assert.deepEqual(registry.list(), []);
});
