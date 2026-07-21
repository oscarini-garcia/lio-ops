import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRota,
  addMember,
  removeMember,
  assigneeFor,
  markDone,
  markSkipped,
  walkCounts,
  entryFor,
} from "../src/rota.js";

test("empty rota has no assignee", () => {
  const rota = createRota();
  assert.equal(assigneeFor(rota, "2026-07-21"), null);
});

test("first member is up first", () => {
  const rota = createRota(["Ana", "Ben"]);
  assert.equal(assigneeFor(rota, "2026-07-21"), "Ana");
});

test("rotation advances after a completed walk", () => {
  let rota = createRota(["Ana", "Ben", "Cleo"]);
  rota = markDone(rota, "2026-07-21");
  assert.equal(assigneeFor(rota, "2026-07-22"), "Ben");
  rota = markDone(rota, "2026-07-22");
  assert.equal(assigneeFor(rota, "2026-07-23"), "Cleo");
  rota = markDone(rota, "2026-07-23");
  assert.equal(assigneeFor(rota, "2026-07-24"), "Ana");
});

test("a skip does not advance the rotation", () => {
  let rota = createRota(["Ana", "Ben"]);
  rota = markDone(rota, "2026-07-21"); // Ana walks
  rota = markSkipped(rota, "2026-07-22"); // Ben skips
  assert.equal(assigneeFor(rota, "2026-07-23"), "Ben");
});

test("someone can cover for the assignee", () => {
  let rota = createRota(["Ana", "Ben", "Cleo"]);
  rota = markDone(rota, "2026-07-21", "Cleo"); // Cleo covers Ana's day
  assert.equal(entryFor(rota, "2026-07-21").member, "Cleo");
  assert.equal(assigneeFor(rota, "2026-07-22"), "Ana");
});

test("a logged date keeps reporting who walked", () => {
  let rota = createRota(["Ana", "Ben"]);
  rota = markDone(rota, "2026-07-21");
  assert.equal(assigneeFor(rota, "2026-07-21"), "Ana");
});

test("double-logging a date throws", () => {
  let rota = createRota(["Ana"]);
  rota = markDone(rota, "2026-07-21");
  assert.throws(() => markDone(rota, "2026-07-21"));
  assert.throws(() => markSkipped(rota, "2026-07-21"));
});

test("removing the last walker falls back to the start of the list", () => {
  let rota = createRota(["Ana", "Ben"]);
  rota = markDone(rota, "2026-07-21", "Ben");
  rota = removeMember(rota, "Ben");
  assert.equal(assigneeFor(rota, "2026-07-22"), "Ana");
});

test("duplicate and empty member names are rejected", () => {
  const rota = createRota(["Ana"]);
  assert.throws(() => addMember(rota, "Ana"));
  assert.throws(() => addMember(rota, "   "));
});

test("walk counts only count completed walks", () => {
  let rota = createRota(["Ana", "Ben"]);
  rota = markDone(rota, "2026-07-21"); // Ana
  rota = markSkipped(rota, "2026-07-22"); // Ben skips
  rota = markDone(rota, "2026-07-23"); // Ben
  rota = markDone(rota, "2026-07-24"); // Ana
  assert.deepEqual(walkCounts(rota), { Ana: 2, Ben: 1 });
});
