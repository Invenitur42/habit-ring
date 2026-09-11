const KEY = "habit-ring-v1";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sample = () => ({
  habits: [
    { id: "h1", name: "Walk 20 minutes", color: "#2f6f4e", days: [1, 2, 3, 4, 5, 6], checks: {} },
    { id: "h2", name: "Read 10 pages", color: "#1f4e79", days: [0, 1, 2, 3, 4, 5, 6], checks: {} },
    { id: "h3", name: "No late coffee", color: "#c45c26", days: [1, 2, 3, 4, 5], checks: {} },
  ],
  selected: "h1",
});

function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : sample();
  } catch {
    return sample();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

let state = load();
let view = new Date();
view.setDate(1);
let editingId = null;

function streak(habit) {
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const iso = todayISO(d);
    const dow = d.getDay();
    if (!habit.days.includes(dow)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (habit.checks[iso]) n += 1;
    else break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function rate30(habit) {
  let due = 0;
  let done = 0;
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    if (habit.days.includes(d.getDay())) {
      due += 1;
      if (habit.checks[todayISO(d)]) done += 1;
    }
    d.setDate(d.getDate() - 1);
  }
  return due ? Math.round((done / due) * 100) : 0;
}

function renderStats() {
  const dueToday = state.habits.filter((h) => h.days.includes(new Date().getDay()));
  const doneToday = dueToday.filter((h) => h.checks[todayISO()]).length;
  const best = Math.max(0, ...state.habits.map(streak));
  document.getElementById("stats").innerHTML = `
    <div class="stat"><span>Done today</span><strong>${doneToday}/${dueToday.length || 0}</strong></div>
    <div class="stat"><span>Habits</span><strong>${state.habits.length}</strong></div>
    <div class="stat"><span>Best streak</span><strong>${best}</strong></div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

function renderList() {
  const iso = todayISO();
  const dow = new Date().getDay();
  document.getElementById("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  document.getElementById("habitList").innerHTML = state.habits
    .map((h) => {
      const scheduled = h.days.includes(dow);
      const on = !!h.checks[iso];
      return `<article class="habit ${scheduled ? "" : "off"}" data-id="${h.id}">
        <button type="button" class="check ${on ? "on" : ""}" data-check="${h.id}" ${scheduled ? "" : "disabled"} aria-label="Mark ${escapeHtml(h.name)}"></button>
        <div>
          <h3 style="color:${h.color}">${escapeHtml(h.name)}</h3>
          <div class="meta">${streak(h)} day streak · ${rate30(h)}% last 30 days ${scheduled ? "" : "· off today"}</div>
        </div>
        <div>
          <button type="button" class="tiny" data-edit="${h.id}">Edit</button>
          <button type="button" class="tiny" data-del="${h.id}">Delete</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderCal() {
  const habit = state.habits.find((h) => h.id === state.selected) || state.habits[0];
  const y = view.getFullYear();
  const m = view.getMonth();
  document.getElementById("monthLabel").textContent = view.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  document.getElementById("calHint").textContent = habit
    ? `Showing ${habit.name}`
    : "Add a habit to see the calendar.";
  const first = new Date(y, m, 1);
  const start = first.getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const heads = DAYS.map((d) => `<span>${d[0]}</span>`).join("");
  let cells = "";
  for (let i = 0; i < start; i++) cells += `<div></div>`;
  for (let day = 1; day <= daysIn; day++) {
    const d = new Date(y, m, day);
    const iso = todayISO(d);
    const scheduled = habit && habit.days.includes(d.getDay());
    const done = habit && habit.checks[iso];
    const cls = ["cell", iso === todayISO() ? "today" : "", done ? "done" : scheduled && iso < todayISO() ? "miss" : ""].join(" ");
    cells += `<div class="${cls}">${day}</div>`;
  }
  document.getElementById("calGrid").innerHTML = heads + cells;
}

function render() {
  renderStats();
  renderList();
  renderCal();
}

document.getElementById("habitList").addEventListener("click", (e) => {
  const check = e.target.closest("[data-check]");
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  const card = e.target.closest("[data-id]");
  if (check) {
    const h = state.habits.find((x) => x.id === check.dataset.check);
    const iso = todayISO();
    if (h.checks[iso]) delete h.checks[iso];
    else h.checks[iso] = true;
    state.selected = h.id;
    save();
    render();
    return;
  }
  if (edit) {
    openDialog(edit.dataset.edit);
    return;
  }
  if (del) {
    state.habits = state.habits.filter((x) => x.id !== del.dataset.del);
    save();
    render();
    return;
  }
  if (card) {
    state.selected = card.dataset.id;
    save();
    render();
  }
});

document.getElementById("prevMonth").onclick = () => {
  view.setMonth(view.getMonth() - 1);
  renderCal();
};
document.getElementById("nextMonth").onclick = () => {
  view.setMonth(view.getMonth() + 1);
  renderCal();
};

const dialog = document.getElementById("habitDialog");
const form = document.getElementById("habitForm");
const dayBox = document.getElementById("dayToggles");
dayBox.innerHTML = DAYS.map(
  (d, i) => `<label><input type="checkbox" name="day" value="${i}" ${i ? "checked" : ""} /> ${d}</label>`
).join("");

function openDialog(id) {
  editingId = id || null;
  document.getElementById("dialogTitle").textContent = id ? "Edit habit" : "New habit";
  const h = state.habits.find((x) => x.id === id);
  form.name.value = h ? h.name : "";
  form.color.value = h ? h.color : "#c45c26";
  [...dayBox.querySelectorAll("input")].forEach((inp) => {
    inp.checked = h ? h.days.includes(Number(inp.value)) : Number(inp.value) !== 0;
  });
  dialog.showModal();
}

document.getElementById("addBtn").onclick = () => openDialog(null);
document.getElementById("cancelDialog").onclick = () => dialog.close();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const days = [...dayBox.querySelectorAll("input:checked")].map((i) => Number(i.value));
  if (!days.length) return;
  if (editingId) {
    const h = state.habits.find((x) => x.id === editingId);
    h.name = form.name.value.trim();
    h.color = form.color.value;
    h.days = days;
  } else {
    state.habits.push({
      id: uid(),
      name: form.name.value.trim(),
      color: form.color.value,
      days,
      checks: {},
    });
  }
  save();
  dialog.close();
  render();
});

document.getElementById("resetBtn").onclick = () => {
  state = sample();
  save();
  render();
};

document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "habit-ring.json";
  a.click();
};

render();
