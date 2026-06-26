const API_URL = "https://script.google.com/macros/s/AKfycbxDde0a_OXnFPEXP4NosHMislG6XKBgS11r3mwRJCPJ0wH31P1V_5bPKOVmB6WlQiZY/exec";
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
}

async function apiGet(action) {
  if (!API_URL) throw new Error("尚未設定 API_URL");

  const url = `${API_URL}?action=${encodeURIComponent(action)}&organizationId=${encodeURIComponent(ORG_ID)}`;
  const res = await fetch(url);
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

  return await res.json();
}

async function loadInit() {
  try {
    setStatus("連線中...");

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

    setStatus("已連線", "ok");
  } catch (err) {
    console.error(err);
    setStatus("離線展示模式", "err");
    seedDemo();
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
        c.priority,
        c.status
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
        c.status
      ])
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
      s.status
    ])
  );
}

function table(headers, rows) {
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
                    ${r.map((v) => `<td>${esc(v || "")}</td>`).join("")}
                  </tr>
                `
              )
              .join("")
          : `<tr><td colspan="${headers.length}">目前尚無資料</td></tr>`
      }
    </tbody>
  `;
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
    alert("請至少輸入民眾姓名或案件內容");
    return;
  }

  try {
    const res = await apiPost("createCase", payload);

    if (!res.ok) {
      throw new Error(res.message || "新增失敗");
    }

    await loadInit();
    clearCaseForm();
    alert("新增成功");
  } catch (err) {
    alert("新增失敗：" + err.message);
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
    alert("請先輸入民眾陳情內容");
    return;
  }

  if ($("aiResult")) {
    $("aiResult").textContent = "分析中...";
  }

  try {
    const res = await apiPost("aiFiling", {
      rawContent,
      autoCreateCase
    });

    if (!res.ok) {
      throw new Error(res.message || "AI 歸檔失敗");
    }

    if ($("aiResult")) {
      $("aiResult").textContent = JSON.stringify(res, null, 2);
    }

    await loadInit();
  } catch (err) {
    if ($("aiResult")) {
      $("aiResult").textContent = "失敗：" + err.message;
    }
  }
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
    alert("拜訪紀錄已新增");
  } catch (err) {
    alert(err.message);
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
    alert("行程已新增");
  } catch (err) {
    alert(err.message);
  }
}
