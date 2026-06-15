"use strict";

/* ============================================================
   Cowork Cost Estimator — calculation engine
   Model mirrors CustomerCoworkEstimator (Budget sheet):
     perUserCredits = L*cppLight + M*cppMedium + H*cppHeavy
     monthlyCredits = Σ(users_i * perUserCredits_i)
     monthlyBudget$ = monthlyCredits / 100      (1 credit = $0.01)
     avgPerUser$    = monthlyBudget / totalUsers
   ============================================================ */

const ROLES = [
  { id: "corp",  name: "Corporate Knowledge Workers",        users: 0, light: 22, medium: 11, heavy: 5 },
  { id: "cust",  name: "Customer-Facing Knowledge Workers",  users: 0, light: 17, medium: 13, heavy: 5 },
  { id: "tech",  name: "Technical Workers",                  users: 0, light: 12, medium: 9,  heavy: 14 },
  { id: "mgmt",  name: "Managers & Senior Leaders",          users: 0, light: 13, medium: 6,  heavy: 3 },
];

const DEFAULT_CPP = { light: 125, medium: 500, heavy: 2500 };

// Deep-cloneable working state
let state = ROLES.map(r => ({ ...r }));

/* ---------- Formatting helpers ---------- */
const fmtInt = n => Math.round(n).toLocaleString("en-US");
const fmtUSD = (n, dp = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp });

function num(v) { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0; }

/* ---------- Build Step 1 + Step 2 rows ---------- */
function buildRows() {
  const usersBody = document.getElementById("users-body");
  const promptsBody = document.getElementById("prompts-body");
  usersBody.innerHTML = "";
  promptsBody.innerHTML = "";

  state.forEach((r, i) => {
    // Step 1 — user counts
    const ur = document.createElement("tr");
    ur.innerHTML = `
      <td class="th-label">${r.name}</td>
      <td class="th-num">
        <input type="number" class="num-input" data-i="${i}" data-f="users"
               min="0" step="1" value="${r.users}" aria-label="Users — ${r.name}" />
      </td>`;
    usersBody.appendChild(ur);

    // Step 2 — prompts per user
    const pr = document.createElement("tr");
    pr.innerHTML = `
      <td class="th-label">${r.name}</td>
      <td class="th-num"><input type="number" class="num-input" data-i="${i}" data-f="light"  min="0" step="1" value="${r.light}"  aria-label="Light prompts — ${r.name}" /></td>
      <td class="th-num"><input type="number" class="num-input" data-i="${i}" data-f="medium" min="0" step="1" value="${r.medium}" aria-label="Medium prompts — ${r.name}" /></td>
      <td class="th-num"><input type="number" class="num-input" data-i="${i}" data-f="heavy"  min="0" step="1" value="${r.heavy}"  aria-label="Heavy prompts — ${r.name}" /></td>
      <td class="result-cell" id="peruser-${i}">0</td>`;
    promptsBody.appendChild(pr);
  });

  document.querySelectorAll('input[data-f]').forEach(inp => {
    inp.addEventListener("input", onInput);
  });
}

function onInput(e) {
  const i = +e.target.dataset.i;
  const f = e.target.dataset.f;
  state[i][f] = num(e.target.value);
  recalc();
}

/* ---------- Core calculation ---------- */
function getCPP() {
  return {
    light:  num(document.getElementById("cpp-light").value),
    medium: num(document.getElementById("cpp-medium").value),
    heavy:  num(document.getElementById("cpp-heavy").value),
  };
}

function recalc() {
  const cpp = getCPP();
  let monthlyCredits = 0;
  let totalUsers = 0;
  const perRole = [];

  state.forEach((r, i) => {
    const perUser = r.light * cpp.light + r.medium * cpp.medium + r.heavy * cpp.heavy;
    const roleCredits = perUser * r.users;
    monthlyCredits += roleCredits;
    totalUsers += r.users;
    perRole.push({ name: r.name, perUser, roleCredits, users: r.users });

    const cell = document.getElementById(`peruser-${i}`);
    if (cell) cell.textContent = fmtInt(perUser);
  });

  const budget = monthlyCredits / 100;          // 1 credit = $0.01
  const avg = totalUsers > 0 ? budget / totalUsers : 0;

  // Totals
  document.getElementById("total-users").textContent = fmtInt(totalUsers);
  document.getElementById("out-budget").textContent = fmtUSD(budget, budget < 1000 ? 2 : 0);
  document.getElementById("out-credits").textContent = fmtInt(monthlyCredits);
  document.getElementById("out-avg").textContent = fmtUSD(avg, 2);
  document.getElementById("out-users").textContent = fmtInt(totalUsers);
  document.getElementById("out-annual").textContent = fmtUSD(budget * 12, 0);

  // Breakdown by role
  const list = document.getElementById("breakdown-list");
  list.innerHTML = "";
  const maxCredits = Math.max(...perRole.map(p => p.roleCredits), 1);
  perRole.forEach(p => {
    const li = document.createElement("li");
    const pct = (p.roleCredits / maxCredits) * 100;
    li.innerHTML = `
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between">
          <span class="bk-name">${p.name}</span>
          <span class="bk-val">${fmtInt(p.roleCredits)}</span>
        </div>
        <div class="bk-bar" style="width:${pct}%"></div>
      </div>`;
    list.appendChild(li);
  });

  return { cpp, monthlyCredits, budget, avg, totalUsers, perRole };
}

/* ---------- Reset ---------- */
function resetDefaults() {
  state = ROLES.map(r => ({ ...r }));
  document.getElementById("cpp-light").value = DEFAULT_CPP.light;
  document.getElementById("cpp-medium").value = DEFAULT_CPP.medium;
  document.getElementById("cpp-heavy").value = DEFAULT_CPP.heavy;
  buildRows();
  recalc();
}

/* ---------- PDF export (jsPDF, text-based, crisp) ---------- */
function exportPDF() {
  const data = recalc();
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { window.print(); return; }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;
  const navy = [30, 39, 97];
  const muted = [91, 100, 128];

  // Header band
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Microsoft Copilot Cowork — Cost Estimate", M, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.setTextColor(...[202, 220, 252]);
  doc.text("Usage-based budget model · list pricing (USD) · 1 Credit = $0.01", M, 56);
  y = 110;

  // Headline figures
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Estimate summary", M, y); y += 8;
  doc.setDrawColor(226, 231, 243); doc.line(M, y, W - M, y); y += 22;

  const rows = [
    ["Est. monthly Cowork budget (list pricing)", fmtUSD(data.budget, data.budget < 1000 ? 2 : 0)],
    ["Est. annual Cowork budget", fmtUSD(data.budget * 12, 0)],
    ["Est. monthly Copilot Credits", fmtInt(data.monthlyCredits)],
    ["Total users", fmtInt(data.totalUsers)],
    ["Average price / user / month", fmtUSD(data.avg, 2)],
  ];
  doc.setFontSize(11);
  rows.forEach(([label, val], idx) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...muted);
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...navy);
    doc.text(String(val), W - M, y, { align: "right" });
    y += 20;
    if (idx === 0) y += 2;
  });
  y += 14;

  // Credits-per-prompt assumptions
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...navy);
  doc.text("Credits per prompt (Step 3)", M, y); y += 8;
  doc.setDrawColor(226, 231, 243); doc.line(M, y, W - M, y); y += 20;
  doc.setFontSize(10);
  [["Light", data.cpp.light], ["Medium", data.cpp.medium], ["Heavy", data.cpp.heavy]].forEach(([k, v]) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...muted);
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...navy);
    doc.text(fmtInt(v) + " credits", W - M, y, { align: "right" });
    y += 17;
  });
  y += 16;

  // Per-role table
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...navy);
  doc.text("Breakdown by role", M, y); y += 8;
  doc.setDrawColor(226, 231, 243); doc.line(M, y, W - M, y); y += 18;

  const c1 = M, c2 = 270, c3 = 360, c4 = 470;
  doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "bold");
  doc.text("ROLE", c1, y);
  doc.text("USERS", c2, y, { align: "right" });
  doc.text("CREDITS/USER", c3 + 40, y, { align: "right" });
  doc.text("MONTHLY CREDITS", W - M, y, { align: "right" });
  y += 6; doc.line(M, y, W - M, y); y += 16;

  doc.setFontSize(10);
  data.perRole.forEach(p => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(40, 44, 70);
    doc.text(p.name, c1, y, { maxWidth: 200 });
    doc.text(fmtInt(p.users), c2, y, { align: "right" });
    doc.text(fmtInt(p.perUser), c3 + 40, y, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setTextColor(...navy);
    doc.text(fmtInt(p.roleCredits), W - M, y, { align: "right" });
    y += 18;
  });
  doc.line(M, y, W - M, y); y += 16;
  doc.setFont("helvetica", "bold"); doc.setTextColor(...navy); doc.setFontSize(10);
  doc.text("Total", c1, y);
  doc.text(fmtInt(data.totalUsers), c2, y, { align: "right" });
  doc.text(fmtInt(data.monthlyCredits), W - M, y, { align: "right" });

  // Footer / disclaimer
  const fy = doc.internal.pageSize.getHeight() - 70;
  doc.setDrawColor(226, 231, 243); doc.line(M, fy, W - M, fy);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...muted);
  const disc = "Illustrative only. Figures derive from aggregated, anonymized Cowork Frontier program data and may not reflect all customers. Not definitive, complete, or predictive of future outcomes. Microsoft disclaims any warranties related to expected results. List pricing, USD.";
  doc.text(disc, M, fy + 14, { maxWidth: W - M * 2 });
  const stamp = "Generated " + new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  doc.setTextColor(...navy); doc.setFont("helvetica", "bold");
  doc.text(stamp, M, fy + 44);

  doc.save("Cowork-Cost-Estimate.pdf");
}

/* ---------- Init ---------- */
function init() {
  buildRows();
  recalc();
  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-pdf").addEventListener("click", exportPDF);
  document.getElementById("btn-reset").addEventListener("click", resetDefaults);
  ["cpp-light", "cpp-medium", "cpp-heavy"].forEach(id =>
    document.getElementById(id).addEventListener("input", recalc)
  );
  const stamp = document.getElementById("gen-stamp");
  if (stamp) stamp.textContent = "Generated " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
