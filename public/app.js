import {
  createRota,
  addMember,
  removeMember,
  assigneeFor,
  markDone,
  markSkipped,
  walkCounts,
  entryFor,
  todayKey,
} from "./rota.js";

const STORAGE_KEY = "morning-dog-walk";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt state — start fresh rather than crash on every load.
  }
  return createRota();
}

function save(rota) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rota));
}

let rota = load();

const $ = (id) => document.getElementById(id);

function update(next) {
  rota = next;
  save(rota);
  render();
}

function render() {
  const today = todayKey();
  const assignee = assigneeFor(rota, today);
  const entry = entryFor(rota, today);

  $("assignee").textContent = assignee ?? "Add someone below 👇";
  $("today-actions").classList.toggle("hidden", !assignee || !!entry);

  const status = $("today-status");
  if (entry) {
    status.textContent =
      entry.status === "done"
        ? `${entry.member} walked the dog this morning. 🎉`
        : "Skipped this morning — same walker tomorrow.";
    status.classList.remove("hidden");
  } else {
    status.classList.add("hidden");
  }

  const memberList = $("member-list");
  memberList.innerHTML = "";
  for (const name of rota.members) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = name;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "✕";
    btn.title = `Remove ${name}`;
    btn.addEventListener("click", () => update(removeMember(rota, name)));
    li.append(span, btn);
    memberList.appendChild(li);
  }

  const counts = walkCounts(rota);
  const statsList = $("stats-list");
  statsList.innerHTML = "";
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    const countSpan = document.createElement("span");
    countSpan.className = "muted";
    countSpan.textContent = `${count} walk${count === 1 ? "" : "s"}`;
    li.append(nameSpan, countSpan);
    statsList.appendChild(li);
  }
  if (sorted.length === 0) {
    statsList.innerHTML = '<li><span class="muted">No walks logged yet.</span></li>';
  }

  const historyList = $("history-list");
  historyList.innerHTML = "";
  const recent = [...rota.entries].reverse().slice(0, 14);
  for (const e of recent) {
    const li = document.createElement("li");
    const dateSpan = document.createElement("span");
    dateSpan.className = "muted";
    dateSpan.textContent = e.date;
    const whoSpan = document.createElement("span");
    if (e.status === "done") {
      whoSpan.textContent = `${e.member} ✓`;
    } else {
      whoSpan.textContent = "skipped";
      whoSpan.className = "skipped";
    }
    li.append(dateSpan, whoSpan);
    historyList.appendChild(li);
  }
  if (recent.length === 0) {
    historyList.innerHTML = '<li><span class="muted">Nothing yet — first walk pending!</span></li>';
  }
}

$("done-btn").addEventListener("click", () => {
  update(markDone(rota, todayKey()));
});

$("covered-btn").addEventListener("click", () => {
  const assignee = assigneeFor(rota, todayKey());
  const others = rota.members.filter((m) => m !== assignee);
  const who = prompt(`Who walked the dog instead?\n(${others.join(", ")})`);
  if (!who) return;
  const match = rota.members.find((m) => m.toLowerCase() === who.trim().toLowerCase());
  if (!match) {
    alert(`"${who}" isn't in the household list.`);
    return;
  }
  update(markDone(rota, todayKey(), match));
});

$("skip-btn").addEventListener("click", () => {
  update(markSkipped(rota, todayKey()));
});

$("add-member-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("member-input");
  try {
    update(addMember(rota, input.value));
    input.value = "";
  } catch (err) {
    alert(err.message);
  }
});

render();
