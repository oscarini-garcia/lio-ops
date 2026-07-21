// Core rota logic for the morning dog walk. Pure functions over a plain
// state object so the UI layer (and tests) can persist it however they like.
//
// State shape:
//   {
//     members: ["Ana", "Ben", ...],
//     entries: [{ date: "2026-07-21", member: "Ana", status: "done" | "skipped" }]
//   }
//
// Rotation rule: whoever comes after the last person who actually walked the
// dog (status "done") is up next. Skipped days don't advance the rotation, so
// a skip means you still owe the next walk.

export function createRota(members = []) {
  return { members: [...members], entries: [] };
}

export function addMember(rota, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Member name cannot be empty");
  if (rota.members.includes(trimmed)) throw new Error(`${trimmed} is already in the rota`);
  return { ...rota, members: [...rota.members, trimmed] };
}

export function removeMember(rota, name) {
  return { ...rota, members: rota.members.filter((m) => m !== name) };
}

function lastDoneEntry(rota) {
  for (let i = rota.entries.length - 1; i >= 0; i--) {
    if (rota.entries[i].status === "done") return rota.entries[i];
  }
  return null;
}

export function entryFor(rota, date) {
  return rota.entries.find((e) => e.date === date) ?? null;
}

// Who should take the dog out on the given date?
// Returns null if there are no members or the date is already logged.
export function assigneeFor(rota, date) {
  if (rota.members.length === 0) return null;
  const existing = entryFor(rota, date);
  if (existing) return existing.member;

  const last = lastDoneEntry(rota);
  if (!last) return rota.members[0];

  const lastIndex = rota.members.indexOf(last.member);
  // Member may have been removed since; fall back to the start of the list.
  if (lastIndex === -1) return rota.members[0];
  return rota.members[(lastIndex + 1) % rota.members.length];
}

// Record that the walk happened. `member` defaults to whoever was assigned,
// but can be overridden when someone covers for the assignee.
export function markDone(rota, date, member) {
  const walker = member ?? assigneeFor(rota, date);
  if (!walker) throw new Error("No members in the rota");
  if (entryFor(rota, date)) throw new Error(`${date} is already logged`);
  return {
    ...rota,
    entries: [...rota.entries, { date, member: walker, status: "done" }],
  };
}

// Record that nobody walked the dog that morning. The rotation does not
// advance, so the same person is up the next day.
export function markSkipped(rota, date) {
  const assignee = assigneeFor(rota, date);
  if (!assignee) throw new Error("No members in the rota");
  if (entryFor(rota, date)) throw new Error(`${date} is already logged`);
  return {
    ...rota,
    entries: [...rota.entries, { date, member: assignee, status: "skipped" }],
  };
}

// Walks completed per member, for the stats view.
export function walkCounts(rota) {
  const counts = Object.fromEntries(rota.members.map((m) => [m, 0]));
  for (const e of rota.entries) {
    if (e.status === "done") counts[e.member] = (counts[e.member] ?? 0) + 1;
  }
  return counts;
}

export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
