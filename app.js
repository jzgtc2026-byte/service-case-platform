const API_URL = ""; // 貼上 Apps Script Web App URL，例如 https://script.google.com/macros/s/xxxx/exec
const ORG_ID = "ORG-JZG";

let state = { cases: [], citizens: [], categories: [], departments: [], visits: [], schedule: [], dashboard: {} };

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
  document.getElementById("menuBtn").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  loadInit();
});

function showPage(id) {
  document.querySelectorAll(".nav").forEach(n => n.classList.toggle("active", n.dataset.page === id));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.getElementById("pageTitle").textContent = document.querySelector(`.nav[data-page="${id}"]`).textContent.replace(/[^\u4e00-\u9fa5A-Za-z]/g,"").trim();
  document.getElementById("sidebar").classList.remove("open");
}

async function apiGet(action) {
  if (!API_URL) throw new Error("尚未設定 API_URL");
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}&organizationId=${encodeURIComponent(ORG_ID)}`);
  return await res.json();
}

async function apiPost(action, payload = {}) {
  if (!API_URL) throw new Error("尚未設定 API_URL");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload: { organizationId: ORG_ID, ...payload } })
  });
  return await res.json();
}

async function loadInit() {
  try {
    setStatus("連線中...");
    const data = await apiGet("init");
    if (!data.ok) throw new Error(data.message || "讀取失敗");
    state = { ...state, ...data };
    setStatus("已連線", "ok");
  } catch (err) {
    setStatus("離線展示模式", "err");
    seedDemo();
  }
  renderAll();
}

function seedDemo() {
  state.dashboard = { totalCases: 3, todayCases: 1, processingCases: 2, aiFiledCases: 1 };
  state.categories = [{categoryName:"道路"},{categoryName:"排水"},{categoryName:"路燈"},{categoryName:"交通"},{categoryName:"環境"},{categoryName:"社福"}];
  state.cases = [
    {caseNo:"CASE-001", citizenName:"王先生", categoryName:"排水", title:"水溝蓋破損", address:"東興路一段附近", priority:"急件", status:"處理中"},
    {caseNo:"CASE-002", citizenName:"李小姐", categoryName:"路燈", title:"路燈不亮", address:"和平里", priority:"一般", status:"待受理"},
    {caseNo:"CASE-003", citizenName:"陳先生", categoryName:"交通", title:"違停嚴重", address:"五權路", priority:"一般", status:"已完成"}
  ];
  state.citizens = [{name:"王先生", phone:"0912xxx", address:"東興路", caseCount:1},{name:"李小姐", phone:"0922xxx", address:"和平里", caseCount:1}];
  state.visits = [];
  state.schedule = [];
}

function setStatus(text, cls = "") {
  const el = document.getElementById("apiStatus");
  el.textContent = text;
  el.className = "apiStatus " + cls;
}

function renderAll() {
  const org = state.organization || {};
  if (org.organizationName) document.getElementById("brandName").textContent = org.organizationName;
  const d = state.dashboard || state.stats || {};
  totalCases.textContent = d.totalCases || d.total || state.cases.length || 0;
  todayCases.textContent = d.todayCases || 0;
  processingCases.textContent = d.processingCases || 0;
  aiFiledCases.textContent = d.aiFiledCases || d.aiFiled || 0;
  renderCategories();
  renderCases();
  renderCitizens();
  renderVisits();
  renderSchedule();
}

function renderCategories() {
  const sel = document.getElementById("caseCategory");
  sel.innerHTML = (state.categories || []).map(c => `<option>${esc(c.categoryName)}</option>`).join("") || "<option>一般陳情</option>";
}

function renderCases() {
  const rows = (state.cases || []).slice().reverse();
  const html = table(["編號","民眾","分類","標題","地址","急迫","狀態"], rows.map(c => [c.caseNo,c.citizenName,c.categoryName,c.title,c.address,c.priority,c.status]));
  caseTable.innerHTML = html;
  recentCases.innerHTML = table(["編號","民眾","分類","狀態"], rows.slice(0,6).map(c => [c.caseNo,c.citizenName,c.categoryName,c.status]));
}

function renderCitizens() {
  citizenTable.innerHTML = table(["姓名","電話","地址","里別","案件數"], (state.citizens || []).map(c => [c.name,c.phone,c.address,c.village,c.caseCount]));
}

function renderVisits() {
  visitTable.innerHTML = table(["日期","對象","地址","里別","內容"], (state.visits || []).map(v => [v.visitDate,v.citizenName,v.address,v.village,v.summary || v.content]));
}

function renderSchedule() {
  scheduleTable.innerHTML = table(["日期","時間","標題","地點","狀態"], (state.schedule || []).map(s => [s.startDate,s.startTime,s.title,s.location,s.status]));
}

function table(headers, rows) {
  return `<thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v||"")}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

async function createCase() {
  const payload = {
    citizenName: caseName.value, phone: casePhone.value, categoryName: caseCategory.value,
    priority: casePriority.value, address: caseAddress.value, village: caseVillage.value,
    content: caseContent.value, title: `${caseCategory.value}｜${caseContent.value.slice(0,18)}`
  };
  try {
    const res = await apiPost("createCase", payload);
    if (!res.ok) throw new Error(res.message);
    state.cases.push(res.case);
    await loadInit();
    alert("新增成功");
  } catch (err) {
    alert("新增失敗：" + err.message);
  }
}

async function runAIFiling(autoCreateCase = true) {
  const rawContent = aiInput.value.trim();
  if (!rawContent) return alert("請先輸入民眾陳情內容");
  aiResult.textContent = "分析中...";
  try {
    const res = await apiPost("aiFiling", { rawContent, autoCreateCase });
    if (!res.ok) throw new Error(res.message);
    aiResult.textContent = JSON.stringify(res, null, 2);
    await loadInit();
  } catch (err) {
    aiResult.textContent = "失敗：" + err.message;
  }
}

async function createVisit() {
  try {
    const res = await apiPost("createVisit", {
      citizenName: visitName.value, address: visitAddress.value, village: visitVillage.value,
      content: visitContent.value, summary: visitContent.value
    });
    if (!res.ok) throw new Error(res.message);
    await loadInit();
    alert("拜訪紀錄已新增");
  } catch (err) { alert(err.message); }
}

async function createSchedule() {
  try {
    const res = await apiPost("createSchedule", {
      title: schTitle.value, startDate: schDate.value, startTime: schTime.value, location: schLocation.value
    });
    if (!res.ok) throw new Error(res.message);
    await loadInit();
    alert("行程已新增");
  } catch (err) { alert(err.message); }
}