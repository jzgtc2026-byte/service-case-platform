const API_URL = "https://script.google.com/macros/s/AKfycbwghaXnJlNbljeHIlaND-D6VJ9a52WODhd1cCs4NFuMBoEpX_NYu0SDbmlQTFyPOsvD/exec";
const ORG_ID = "ORG-JZG";

const $ = (id) => document.getElementById(id);

let state = {
  cases: [],
  citizens: [],
  categories: [],
  departments: [],
  visits: [],
  schedule: [],
  dashboard: {}
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  $("menuBtn")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });

  ensureToastBox();
  loadInit();
});

function showPage(id) {
  document.querySelectorAll(".nav").forEach((n) => {
    n.classList.toggle("active", n.dataset.page === id);
  });

  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("active", p.id === id);
  });

  const nav = document.querySelector(`.nav[data-page="${id}"]`);
  if ($("pageTitle") && nav) {
    $("pageTitle").textContent = nav.textContent
      .replace(/[^\u4e00-\u9fa5A-Za-z]/g, "")
      .trim();
  }

  $("sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function apiGet(action) {
  if (!API_URL) throw new Error("尚未設定 API_URL");

  const url = `${API_URL}?action=${encodeURIComponent(action)}&organizationId=${encodeURIComponent(ORG_ID)}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`API 讀取失敗：${res.status}`);

  return await res.json();
}

async function apiPost(action, payload = {}) {
  if (!API_URL) throw new Error("尚未設定 API_URL");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      payload: {
        organizationId: ORG_ID,
        ...payload
      }
    })
  });

  if (!res.ok) throw new Error(`API 寫入失敗：${res.status}`);

  return await res.json();
}

async function loadInit() {
  try {
    setStatus("讀取資料...", "");

    const data = await apiGet("init");

    if (!data.ok) {
      throw new Error(data.message || "讀取失敗");
    }

    state = {
      ...state,
      ...data,
      visits: data.visits || state.visits || [],
      schedule: data.schedule || data.schedules || state.schedule || []
    };

    setStatus("已同步", "ok");
  } catch (err) {
    console.error(err);
    setStatus("離線展示", "err");
    seedDemo();
    toast("離線展示模式", "目前使用示範資料，請確認 Apps Script 部署與權限。", "error");
  }

  renderAll();
}

function seedDemo() {
  state.dashboard = {
    totalCases: 3,
    todayCases: 1,
    processingCases: 2,
    aiFiledCases: 1
  };

  state.categories = [
    { categoryName: "道路" },
    { categoryName: "排水" },
    { categoryName: "路燈" },
    { categoryName: "交通" },
    { categoryName: "環境" },
    { categoryName: "社福" }
  ];

  state.cases = [
    {
      caseNo: "CASE-001",
      citizenName: "王先生",
      categoryName: "排水",
      title: "水溝蓋破損",
      address: "東興路一段附近",
      priority: "急件",
      status: "處理中"
    },
    {
      caseNo: "CASE-002",
      citizenName: "李小姐",
      categoryName: "路燈",
      title: "路燈不亮",
      address: "和平里",
      priority: "一般",
      status: "待受理"
    },
    {
      caseNo: "CASE-003",
      citizenName: "陳先生",
      categoryName: "交通",
      title: "違停嚴重",
      address: "五權路",
      priority: "一般",
      status: "已完成"
    }
  ];

  state.citizens = [
    {
      name: "王先生",
      phone: "0912xxx",
      address: "東興路",
      village: "和平里",
      caseCount: 1
    },
    {
      name: "李小姐",
      phone: "0922xxx",
      address: "和平里",
      village: "和平里",
      caseCount: 1
    }
  ];

  state.visits = [];
  state.schedule = [];
}

function setStatus(text, cls = "") {
  const el = $("apiStatus");
  if (!el) return;

  el.textContent = text;
  el.className = "apiStatus " + cls;
}

function renderAll() {
  const org = state.organization || {};
  const d = state.dashboard || state.stats || {};

  if ($("brandName") && org.organizationName) {
    $("brandName").textContent = org.organizationName;
  }

  setText("totalCases", d.totalCases || d.total || state.cases.length || 0);
  setText("todayCases", d.todayCases || 0);
  setText("processingCases", d.processingCases || 0);
  setText("aiFiledCases", d.aiFiledCases || d.aiFiled || 0);

  renderCategories();
  renderCases();
  renderCitizens();
  renderVisits();
  renderSchedule();
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function renderCategories() {
  const sel = $("caseCategory");
  if (!sel) return;

  const categories = state.categories || [];

  sel.innerHTML =
    categories.map((c) => `<option>${esc(c.categoryName)}</option>`).join("") ||
    "<option>一般陳情</option>";
}

function renderCases() {
  const rows = (state.cases || []).slice().reverse();

  if ($("caseTable")) {
    $("caseTable").innerHTML = table(
      ["編號", "民眾", "分類", "標題", "地址", "急迫", "狀態"],
      rows.map((c) => [
        c.caseNo,
        c.citizenName,
        c.categoryName,
        c.title,
        c.address,
        priorityBadge(c.priority),
        statusBadge(c.status)
      ])
    );
  }

  if ($("recentCases")) {
    $("recentCases").innerHTML = table(
      ["編號", "民眾", "分類", "狀態"],
      rows.slice(0, 6).map((c) => [
        c.caseNo,
        c.citizenName,
        c.categoryName,
        statusBadge(c.status)
      ]),
      true
    );
  }
}

function renderCitizens() {
  if (!$("citizenTable")) return;

  $("citizenTable").innerHTML = table(
    ["姓名", "電話", "地址", "里別", "案件數"],
    (state.citizens || []).map((c) => [
      c.name,
      c.phone,
      c.address,
      c.village,
      c.caseCount
    ])
  );
}

function renderVisits() {
  if (!$("visitTable")) return;

  $("visitTable").innerHTML = table(
    ["日期", "對象", "地址", "里別", "內容"],
    (state.visits || []).map((v) => [
      v.visitDate,
      v.citizenName,
      v.address,
      v.village,
      v.summary || v.content
    ])
  );
}

function renderSchedule() {
  if (!$("scheduleTable")) return;

  $("scheduleTable").innerHTML = table(
    ["日期", "時間", "標題", "地點", "狀態"],
    (state.schedule || []).map((s) => [
      s.startDate,
      s.startTime,
      s.title,
      s.location,
      statusBadge(s.status || "預定")
    ]),
    true
  );
}

function table(headers, rows, allowHtml = false) {
  return `
    <thead>
      <tr>
        ${headers.map((h) => `<th>${esc(h)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${
        rows.length
          ? rows
              .map(
                (r) => `
                  <tr>
                    ${r
                      .map((v) => `<td>${allowHtml ? String(v || "") : esc(v || "")}</td>`)
                      .join("")}
                  </tr>
                `
              )
              .join("")
          : emptyRow(headers.length)
      }
    </tbody>
  `;
}

function emptyRow(colspan) {
  return `
    <tr>
      <td colspan="${colspan}">
        <div class="emptyState">
          <b>目前尚無資料</b>
          <span>新增第一筆資料後，會顯示在這裡。</span>
        </div>
      </td>
    </tr>
  `;
}

function statusBadge(status = "") {
  const s = String(status || "待受理");

  let cls = "badge gray";
  let icon = "○";

  if (s.includes("完成") || s.includes("結案")) {
    cls = "badge green";
    icon = "●";
  } else if (s.includes("處理")) {
    cls = "badge yellow";
    icon = "●";
  } else if (s.includes("待")) {
    cls = "badge gray";
    icon = "●";
  } else if (s.includes("取消")) {
    cls = "badge red";
    icon = "●";
  } else if (s.includes("預定")) {
    cls = "badge blue";
    icon = "●";
  }

  return `<span class="${cls}">${icon} ${esc(s)}</span>`;
}

function priorityBadge(priority = "") {
  const p = String(priority || "一般");

  if (p.includes("非常")) {
    return `<span class="badge red">● 非常急</span>`;
  }

  if (p.includes("急")) {
    return `<span class="badge orange">● 急件</span>`;
  }

  return `<span class="badge gray">● 一般</span>`;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}

async function createCase() {
  const payload = {
    citizenName: $("caseName")?.value || "",
    phone: $("casePhone")?.value || "",
    categoryName: $("caseCategory")?.value || "一般陳情",
    priority: $("casePriority")?.value || "一般",
    address: $("caseAddress")?.value || "",
    village: $("caseVillage")?.value || "",
    content: $("caseContent")?.value || "",
    title: `${$("caseCategory")?.value || "一般陳情"}｜${($("caseContent")?.value || "").slice(0, 18)}`
  };

  if (!payload.citizenName && !payload.content) {
    toast("缺少資料", "請至少輸入民眾姓名或案件內容。", "error");
    return;
  }

  try {
    toast("建立中", "正在新增服務案件...", "info");

    const res = await apiPost("createCase", payload);

    if (!res.ok) {
      throw new Error(res.message || "新增失敗");
    }

    await loadInit();
    clearCaseForm();
    toast("建立成功", "服務案件已新增。", "success");
  } catch (err) {
    toast("新增失敗", err.message, "error");
  }
}

function clearCaseForm() {
  ["caseName", "casePhone", "caseAddress", "caseVillage", "caseContent"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
}

async function runAIFiling(autoCreateCase = true) {
  const rawContent = $("aiInput")?.value.trim() || "";

  if (!rawContent) {
    toast("缺少內容", "請先輸入民眾陳情內容。", "error");
    return;
  }

  showAILoading();

  try {
    const res = await apiPost("aiFiling", {
      rawContent,
      autoCreateCase
    });

    if (!res.ok) {
      throw new Error(res.message || "AI 歸檔失敗");
    }

    renderAIResult(res);
    await loadInit();

    toast(
      autoCreateCase ? "AI 已建案" : "AI 分析完成",
      autoCreateCase ? "案件已建立並完成歸檔。" : "分析結果已產生。",
      "success"
    );
  } catch (err) {
    if ($("aiResult")) {
      $("aiResult").textContent = "失敗：" + err.message;
    }

    toast("AI 歸檔失敗", err.message, "error");
  }
}

function showAILoading() {
  if (!$("aiResult")) return;

  $("aiResult").textContent = `
🤖 AI 正在分析案件...

━━━━━━━━━━━━━━━━━━━━

✓ 讀取民眾陳情內容
✓ 判斷案件分類
✓ 擷取地點與里別
✓ 研判急迫程度
✓ 建立案件摘要

━━━━━━━━━━━━━━━━━━━━
`;
}

function renderAIResult(res) {
  if (!$("aiResult")) return;

  const a = res.analysis || {};
  const c = res.case || {};
  const mode = res.mode || "local-rule";

  $("aiResult").textContent = `
🤖 AI 快速歸檔完成

━━━━━━━━━━━━━━━━━━━━

分析模式：
${mode === "gemini" ? "Gemini AI" : "本機規則"}

案件標題：
${a.title || c.title || "未提供"}

案件分類：
${a.categoryName || c.categoryName || "一般陳情"}

案件摘要：
${a.summary || c.summary || c.content || "未提供"}

案件地址：
${a.address || c.address || "待補地址"}

急迫程度：
${a.priority || c.priority || "一般"}

建議承辦：
${a.departmentName || c.departmentName || "待確認"}

案件編號：
${c.caseNo || "尚未建立案件"}

━━━━━━━━━━━━━━━━━━━━
`;
}

async function createVisit() {
  try {
    const res = await apiPost("createVisit", {
      citizenName: $("visitName")?.value || "",
      address: $("visitAddress")?.value || "",
      village: $("visitVillage")?.value || "",
      content: $("visitContent")?.value || "",
      summary: $("visitContent")?.value || ""
    });

    if (!res.ok) {
      throw new Error(res.message || "新增拜訪紀錄失敗");
    }

    await loadInit();
    toast("新增成功", "拜訪紀錄已新增。", "success");
  } catch (err) {
    toast("新增失敗", err.message, "error");
  }
}

async function createSchedule() {
  try {
    const res = await apiPost("createSchedule", {
      title: $("schTitle")?.value || "",
      startDate: $("schDate")?.value || "",
      startTime: $("schTime")?.value || "",
      location: $("schLocation")?.value || "",
      status: "預定"
    });

    if (!res.ok) {
      throw new Error(res.message || "新增行程失敗");
    }

    await loadInit();
    toast("新增成功", "行程已新增。", "success");
  } catch (err) {
    toast("新增失敗", err.message, "error");
  }
}

function copyDashboardAiToMain() {
  const quick = $("dashboardAiInput");
  const ai = $("aiInput");

  if (!quick || !ai) return;

  if (!quick.value.trim()) {
    toast("缺少內容", "請先輸入電話紀錄或民眾陳情內容。", "error");
    return;
  }

  ai.value = quick.value;
  showPage("ai");
  ai.focus();
}

function ensureToastBox() {
  if ($("toastBox")) return;

  const box = document.createElement("div");
  box.id = "toastBox";
  box.className = "toastBox";
  document.body.appendChild(box);
}

function toast(title, message = "", type = "info") {
  ensureToastBox();

  const item = document.createElement("div");
  item.className = "toast " + type;

  item.innerHTML = `
    <b>${esc(title)}</b>
    <span>${esc(message)}</span>
  `;

  $("toastBox").appendChild(item);

  setTimeout(() => {
    item.classList.add("hide");
    setTimeout(() => item.remove(), 260);
  }, 2800);
}
