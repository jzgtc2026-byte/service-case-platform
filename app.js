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
  dashboard: {},
  selectedCaseNo: null
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  $("menuBtn")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });

  ensureToastBox();
  injectPatchStyles();
  initCasePagePatch();
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
      cases: data.cases || [],
      citizens: data.citizens || [],
      categories: data.categories || [],
      departments: data.departments || [],
      visits: data.visits || [],
      schedule: data.schedule || data.schedules || []
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
    { categoryName: "道路交通" },
    { categoryName: "排水溝渠" },
    { categoryName: "路燈照明" },
    { categoryName: "環境清潔" },
    { categoryName: "社福關懷" },
    { categoryName: "其他" }
  ];

  state.cases = [
    {
      caseNo: "CASE-001",
      citizenName: "王先生",
      phone: "0912xxx",
      categoryName: "排水溝渠",
      title: "水溝蓋破損",
      address: "東興路一段附近",
      village: "和平里",
      priority: "急件",
      status: "處理中",
      content: "民眾反映水溝蓋破損，車輛經過有安全疑慮，希望協助處理。",
      owner: "阿明",
      source: "電話",
      createdAt: "2026/06/27"
    },
    {
      caseNo: "CASE-002",
      citizenName: "李小姐",
      phone: "0922xxx",
      categoryName: "路燈照明",
      title: "路燈不亮",
      address: "和平里巷口",
      village: "和平里",
      priority: "一般",
      status: "待處理",
      content: "巷口路燈不亮，夜間行走不安全。",
      owner: "小陳",
      source: "LINE",
      createdAt: "2026/06/27"
    },
    {
      caseNo: "CASE-003",
      citizenName: "陳先生",
      phone: "0933xxx",
      categoryName: "道路交通",
      title: "違停嚴重",
      address: "五權路",
      village: "東南區",
      priority: "一般",
      status: "已完成",
      content: "路口長期違停，影響行車視線。",
      owner: "主任",
      source: "現場陳情",
      createdAt: "2026/06/26"
    }
  ];

  state.citizens = [
    { name: "王先生", phone: "0912xxx", address: "東興路", village: "和平里", caseCount: 1 },
    { name: "李小姐", phone: "0922xxx", address: "和平里", village: "和平里", caseCount: 1 }
  ];

  state.visits = [
    {
      visitDate: "2026/06/27",
      citizenName: "王先生",
      address: "東興路一段附近",
      village: "和平里",
      summary: "現場查看水溝蓋破損情況，已拍照紀錄。"
    }
  ];

  state.schedule = [];
}

function initCasePagePatch() {
  setupCaseModalFromExistingForm();
  setupVisitModalFromExistingForm();
  setupCaseSearchArea();
  setupCaseDetailPanel();
}

function setupCaseModalFromExistingForm() {
  const formInput = $("caseName");
  if (!formInput) return;

  const formPanel = formInput.closest(".panel");
  if (!formPanel) return;

  formPanel.id = "caseFormPanel";

  const originalCreateBtn = formPanel.querySelector('button[onclick="createCase()"]');
  if (originalCreateBtn) {
    originalCreateBtn.textContent = "建立案件";
  }

  if (!$("caseModal")) {
    const overlay = document.createElement("div");
    overlay.id = "caseModal";
    overlay.className = "modalOverlay";
    overlay.appendChild(formPanel);
    document.body.appendChild(overlay);

    const head = formPanel.querySelector(".panelHead");
    if (head && !$("caseModalCloseBtn")) {
      const closeBtn = document.createElement("button");
      closeBtn.id = "caseModalCloseBtn";
      closeBtn.className = "ghost small";
      closeBtn.textContent = "關閉";
      closeBtn.type = "button";
      closeBtn.onclick = closeCaseModal;
      head.appendChild(closeBtn);
    }

    const actions = formPanel.querySelector(".panelHead button");
    if (actions && actions.getAttribute("onclick") === "createCase()") {
      actions.removeAttribute("onclick");
      actions.onclick = createCase;
    }

    const actionBox = document.createElement("div");
    actionBox.className = "actions";
    actionBox.innerHTML = `
      <button type="button" onclick="createCase()">建立案件</button>
      <button type="button" class="ghost" onclick="closeCaseModal()">取消</button>
    `;

    if (!formPanel.querySelector(".actions")) {
      formPanel.appendChild(actionBox);
    }
  }

  const casesPage = $("cases");
  if (!casesPage || $("openCaseModalTopBtn")) return;

  const firstPanel = casesPage.querySelector(".panel");
  const toolbar = document.createElement("div");
  toolbar.className = "caseTopToolbar";
  toolbar.innerHTML = `
    <div>
      <h3>案件中心</h3>
      <p>搜尋、篩選、查看案件列表，點擊案件後管理完整詳情。</p>
    </div>
    <button id="openCaseModalTopBtn" type="button" onclick="openCaseModal()">＋新增案件</button>
  `;

  if (firstPanel) {
    firstPanel.parentNode.insertBefore(toolbar, firstPanel);
  } else {
    casesPage.appendChild(toolbar);
  }
}

function setupVisitModalFromExistingForm() {
  const formInput = $("visitName");
  if (!formInput) return;

  const formPanel = formInput.closest(".panel");
  if (!formPanel) return;

  formPanel.id = "visitFormPanel";

  if (!$("visitModal")) {
    const overlay = document.createElement("div");
    overlay.id = "visitModal";
    overlay.className = "modalOverlay";
    overlay.appendChild(formPanel);
    document.body.appendChild(overlay);

    const head = formPanel.querySelector(".panelHead");
    if (head && !$("visitModalCloseBtn")) {
      const closeBtn = document.createElement("button");
      closeBtn.id = "visitModalCloseBtn";
      closeBtn.className = "ghost small";
      closeBtn.textContent = "關閉";
      closeBtn.type = "button";
      closeBtn.onclick = closeVisitModal;
      head.appendChild(closeBtn);
    }

    const actionBox = document.createElement("div");
    actionBox.className = "actions";
    actionBox.innerHTML = `
      <button type="button" onclick="createVisit()">儲存拜訪</button>
      <button type="button" class="ghost" onclick="closeVisitModal()">取消</button>
    `;

    if (!formPanel.querySelector(".actions")) {
      formPanel.appendChild(actionBox);
    }
  }

  const visitsPage = $("visits");
  if (!visitsPage || $("openVisitModalTopBtn")) return;

  const firstPanel = visitsPage.querySelector(".panel");
  const toolbar = document.createElement("div");
  toolbar.className = "caseTopToolbar";
  toolbar.innerHTML = `
    <div>
      <h3>外勤拜訪紀錄</h3>
      <p>新增拜訪改為彈窗，不再佔滿主頁。</p>
    </div>
    <button id="openVisitModalTopBtn" type="button" onclick="openVisitModal()">＋新增拜訪</button>
  `;

  if (firstPanel) {
    firstPanel.parentNode.insertBefore(toolbar, firstPanel);
  } else {
    visitsPage.appendChild(toolbar);
  }
}

function setupCaseSearchArea() {
  if ($("caseSearch")) return;

  const table = $("caseTable");
  if (!table) return;

  const wrap = table.closest(".tableWrap") || table.parentElement;
  if (!wrap) return;

  const filter = document.createElement("div");
  filter.className = "caseFilterBar";
  filter.innerHTML = `
    <input id="caseSearch" placeholder="搜尋案件編號、姓名、電話、地址、內容..." />
    <select id="caseStatusFilter">
      <option value="">全部狀態</option>
      <option value="待處理">待處理</option>
      <option value="待受理">待受理</option>
      <option value="處理中">處理中</option>
      <option value="追蹤中">追蹤中</option>
      <option value="已完成">已完成</option>
    </select>
    <select id="caseCategoryFilter">
      <option value="">全部類型</option>
    </select>
  `;

  wrap.parentNode.insertBefore(filter, wrap);

  $("caseSearch")?.addEventListener("input", renderCases);
  $("caseStatusFilter")?.addEventListener("change", renderCases);
  $("caseCategoryFilter")?.addEventListener("change", renderCases);
}

function setupCaseDetailPanel() {
  if ($("caseDetailPanel")) return;

  const table = $("caseTable");
  if (!table) return;

  const panel = document.createElement("div");
  panel.id = "caseDetailPanel";
  panel.className = "panel caseDetailPanel";
  panel.innerHTML = `
    <div class="emptyState">
      <b>尚未選擇案件</b>
      <span>請點選上方案件列表查看完整案件詳情。</span>
    </div>
  `;

  const wrap = table.closest(".panel") || table.closest(".tableWrap") || table;
  wrap.parentNode.insertBefore(panel, wrap.nextSibling);
}

function openCaseModal() {
  const modal = $("caseModal");
  if (!modal) return;

  renderCategories();
  modal.classList.add("active");
}

function closeCaseModal() {
  const modal = $("caseModal");
  if (!modal) return;

  modal.classList.remove("active");
}

function openVisitModal() {
  const modal = $("visitModal");
  if (!modal) return;

  modal.classList.add("active");
}

function closeVisitModal() {
  const modal = $("visitModal");
  if (!modal) return;

  modal.classList.remove("active");
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
  setText("processingCases", d.processingCases || countByStatus("處理"));
  setText("aiFiledCases", d.aiFiledCases || d.aiFiled || 0);

  renderCategories();
  renderCases();
  renderRecentCases();
  renderCitizens();
  renderVisits();
  renderSchedule();

  if (!state.selectedCaseNo && state.cases.length) {
    state.selectedCaseNo = state.cases[0].caseNo;
  }

  renderCaseDetail();
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function countByStatus(keyword) {
  return (state.cases || []).filter((c) => String(c.status || "").includes(keyword)).length;
}

function renderCategories() {
  const categories = state.categories || [];

  const options =
    categories.map((c) => `<option>${esc(c.categoryName || c.name || c)}</option>`).join("") ||
    "<option>一般陳情</option>";

  if ($("caseCategory")) {
    $("caseCategory").innerHTML = options;
  }

  if ($("caseCategoryFilter")) {
    $("caseCategoryFilter").innerHTML =
      `<option value="">全部類型</option>` +
      (
        categories.map((c) => {
          const name = c.categoryName || c.name || c;
          return `<option value="${escAttr(name)}">${esc(name)}</option>`;
        }).join("") || `<option value="一般陳情">一般陳情</option>`
      );
  }
}

function getFilteredCases() {
  let rows = (state.cases || []).slice().reverse();

  const q = ($("caseSearch")?.value || "").trim().toLowerCase();
  const status = $("caseStatusFilter")?.value || "";
  const category = $("caseCategoryFilter")?.value || "";

  if (q) {
    rows = rows.filter((c) => {
      const text = [
        c.caseNo,
        c.citizenName,
        c.phone,
        c.categoryName,
        c.title,
        c.address,
        c.village,
        c.content,
        c.summary,
        c.status,
        c.owner
      ].join(" ").toLowerCase();

      return text.includes(q);
    });
  }

  if (status) {
    rows = rows.filter((c) => String(c.status || "").includes(status));
  }

  if (category) {
    rows = rows.filter((c) => String(c.categoryName || "") === category);
  }

  return rows;
}

function renderCases() {
  if (!$("caseTable")) return;

  const rows = getFilteredCases();

  $("caseTable").innerHTML = `
    <thead>
      <tr>
        <th>編號</th>
        <th>民眾</th>
        <th>分類</th>
        <th>標題</th>
        <th>地址</th>
        <th>急迫</th>
        <th>狀態</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows.length
          ? rows.map((c) => `
              <tr class="clickableRow" onclick="selectCase('${escAttr(c.caseNo)}')">
                <td><b>${esc(c.caseNo || "")}</b></td>
                <td>${esc(c.citizenName || "")}</td>
                <td>${esc(c.categoryName || "")}</td>
                <td>${esc(c.title || "")}</td>
                <td>${esc(c.address || "")}</td>
                <td>${priorityBadge(c.priority)}</td>
                <td>${statusBadge(c.status)}</td>
              </tr>
            `).join("")
          : emptyRow(7)
      }
    </tbody>
  `;
}

function renderRecentCases() {
  if (!$("recentCases")) return;

  const rows = (state.cases || []).slice().reverse().slice(0, 6);

  $("recentCases").innerHTML = table(
    ["編號", "民眾", "分類", "狀態"],
    rows.map((c) => [
      c.caseNo,
      c.citizenName,
      c.categoryName,
      statusBadge(c.status)
    ]),
    true
  );
}

function selectCase(caseNo) {
  state.selectedCaseNo = caseNo;
  renderCaseDetail();

  const panel = $("caseDetailPanel");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCaseDetail() {
  const panel = $("caseDetailPanel");
  if (!panel) return;

  const c = (state.cases || []).find((x) => x.caseNo === state.selectedCaseNo);

  if (!c) {
    panel.innerHTML = `
      <div class="emptyState">
        <b>尚未選擇案件</b>
        <span>請點選案件列表查看完整案件詳情。</span>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="panelHead">
      <div>
        <h3>${esc(c.caseNo || "")}｜${esc(c.title || c.categoryName || "服務案件")}</h3>
        <p>${esc(c.citizenName || "未填姓名")}　${esc(c.phone || "")}　${esc(c.address || "")}</p>
      </div>
      <button onclick="openVisitModal()">＋新增拜訪</button>
    </div>

    <div class="caseDetailGrid">
      <div class="caseInfoBox">
        <span>案件狀態</span>
        <b>${stripHtml(statusBadge(c.status))}</b>
      </div>
      <div class="caseInfoBox">
        <span>案件類型</span>
        <b>${esc(c.categoryName || "未分類")}</b>
      </div>
      <div class="caseInfoBox">
        <span>負責人</span>
        <b>${esc(c.owner || "未指派")}</b>
      </div>
      <div class="caseInfoBox">
        <span>優先度</span>
        <b>${esc(c.priority || "一般")}</b>
      </div>
    </div>

    <div class="caseTabs">
      <div class="caseTabCard">
        <h3>基本資料</h3>
        <div class="caseRows">
          <div><b>民眾</b><span>${esc(c.citizenName || "")}</span></div>
          <div><b>電話</b><span>${esc(c.phone || "")}</span></div>
          <div><b>地址</b><span>${esc(c.address || "")}</span></div>
          <div><b>里別</b><span>${esc(c.village || "")}</span></div>
          <div><b>來源</b><span>${esc(c.source || "未填")}</span></div>
        </div>
      </div>

      <div class="caseTabCard">
        <h3>案件內容</h3>
        <p>${esc(c.content || c.summary || "尚未填寫案件內容。")}</p>
      </div>
    </div>

    <div class="caseTabs">
      <div class="caseTabCard">
        <h3>處理流程</h3>
        ${renderTimeline(c)}
      </div>

      <div class="caseTabCard">
        <h3>留言紀錄</h3>
        ${renderComments()}
      </div>
    </div>

    <div class="caseTabs">
      <div class="caseTabCard">
        <h3>拜訪紀錄</h3>
        ${renderCaseVisits(c)}
      </div>

      <div class="caseTabCard">
        <h3>照片附件</h3>
        ${renderPhotos()}
      </div>
    </div>

    <div class="caseTabCard">
      <h3>AI 選配輔助</h3>
      <p>AI 僅作為摘要、分類、相似案件與公文草稿輔助；主系統不依賴 AI 也能運作。</p>
    </div>
  `;
}

function renderTimeline(c) {
  const status = c.status || "待處理";

  const steps = [
    ["建立案件", c.createdAt || "今日"],
    ["服務處受理", status.includes("待") ? "待處理" : "已完成"],
    ["通知承辦單位", status.includes("處理") || status.includes("完成") ? "已完成" : "待處理"],
    ["追蹤改善進度", status.includes("完成") ? "已完成" : "進行中"],
    ["結案歸檔", status.includes("完成") ? "已完成" : "尚未完成"]
  ];

  return `
    <div class="caseRows">
      ${steps.map((s) => `
        <div>
          <b>${esc(s[0])}</b>
          <span>${esc(s[1])}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderComments() {
  return `
    <div class="caseRows">
      <div><b>阿明</b><span>已建立案件，等待承辦單位回覆。</span></div>
      <div><b>主任</b><span>請今日確認是否需要安排會勘。</span></div>
      <div><b>系統</b><span>後續可接留言資料表。</span></div>
    </div>
  `;
}

function renderCaseVisits(c) {
  const visits = (state.visits || []).filter((v) => {
    return !v.caseNo || v.caseNo === c.caseNo || v.citizenName === c.citizenName;
  });

  if (!visits.length) {
    return `<p>目前尚無拜訪紀錄。</p>`;
  }

  return `
    <div class="caseRows">
      ${visits.map((v) => `
        <div>
          <b>${esc(v.visitDate || "未填日期")}</b>
          <span>${esc(v.summary || v.content || "")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPhotos() {
  return `
    <div class="caseRows">
      <div><b>照片牆</b><span>之後可接 Google Drive 或 Supabase Storage。</span></div>
      <div><b>附件</b><span>可放公文、LINE 截圖、會勘照片、錄音、PDF。</span></div>
    </div>
  `;
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
          ? rows.map((r) => `
              <tr>
                ${r.map((v) => `<td>${allowHtml ? String(v || "") : esc(v || "")}</td>`).join("")}
              </tr>
            `).join("")
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
  const s = String(status || "待處理");

  if (s.includes("完成") || s.includes("結案")) {
    return `<span class="badge green">● ${esc(s)}</span>`;
  }

  if (s.includes("處理") || s.includes("追蹤")) {
    return `<span class="badge yellow">● ${esc(s)}</span>`;
  }

  if (s.includes("取消")) {
    return `<span class="badge red">● ${esc(s)}</span>`;
  }

  if (s.includes("預定")) {
    return `<span class="badge blue">● ${esc(s)}</span>`;
  }

  return `<span class="badge gray">● ${esc(s)}</span>`;
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

async function createCase() {
  const payload = {
    citizenName: $("caseName")?.value || "",
    phone: $("casePhone")?.value || "",
    categoryName: $("caseCategory")?.value || "一般陳情",
    priority: $("casePriority")?.value || "一般",
    address: $("caseAddress")?.value || "",
    village: $("caseVillage")?.value || "",
    content: $("caseContent")?.value || "",
    title: `${$("caseCategory")?.value || "一般陳情"}｜${(($("caseContent")?.value || "").slice(0, 18) || $("caseAddress")?.value || $("caseName")?.value || "")}`,
    status: "待處理"
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
    closeCaseModal();
    clearCaseForm();
    toast("建立成功", "服務案件已新增。", "success");
  } catch (err) {
    const localCase = {
      ...payload,
      caseNo: "LOCAL-" + String(Date.now()).slice(-6),
      createdAt: new Date().toLocaleDateString("zh-TW")
    };

    state.cases.push(localCase);
    state.selectedCaseNo = localCase.caseNo;

    renderAll();
    closeCaseModal();
    clearCaseForm();

    toast("已建立本機案件", "API 寫入失敗，先暫存在前端展示。", "error");
  }
}

function clearCaseForm() {
  ["caseName", "casePhone", "caseAddress", "caseVillage", "caseContent"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
}

async function createVisit() {
  const payload = {
    caseNo: state.selectedCaseNo || "",
    citizenName: $("visitName")?.value || "",
    address: $("visitAddress")?.value || "",
    village: $("visitVillage")?.value || "",
    content: $("visitContent")?.value || "",
    summary: $("visitContent")?.value || ""
  };

  try {
    const res = await apiPost("createVisit", payload);

    if (!res.ok) {
      throw new Error(res.message || "新增拜訪紀錄失敗");
    }

    await loadInit();
    closeVisitModal();
    clearVisitForm();
    toast("新增成功", "拜訪紀錄已新增。", "success");
  } catch (err) {
    state.visits.push({
      ...payload,
      visitDate: new Date().toLocaleDateString("zh-TW")
    });

    renderAll();
    closeVisitModal();
    clearVisitForm();

    toast("已建立本機拜訪紀錄", "API 寫入失敗，先暫存在前端展示。", "error");
  }
}

function clearVisitForm() {
  ["visitName", "visitAddress", "visitVillage", "visitContent"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
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

✓ 讀取民眾陳情內容
✓ 判斷案件分類
✓ 擷取地點與里別
✓ 研判急迫程度
✓ 建立案件摘要
`;
}

function renderAIResult(res) {
  if (!$("aiResult")) return;

  const a = res.analysis || {};
  const c = res.case || {};
  const mode = res.mode || "local-rule";

  $("aiResult").textContent = `
🤖 AI 快速歸檔完成

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
`;
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

function injectPatchStyles() {
  if ($("patchStyles")) return;

  const style = document.createElement("style");
  style.id = "patchStyles";
  style.textContent = `
    .modalOverlay{
      position:fixed;
      inset:0;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(30,43,39,.46);
      z-index:9999;
    }

    .modalOverlay.active{
      display:flex;
    }

    .modalOverlay > .panel{
      width:min(760px,100%);
      max-height:90vh;
      overflow:auto;
      margin:0;
    }

    .caseTopToolbar{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:14px;
      background:#fff;
      border:1px solid var(--border);
      border-radius:22px;
      padding:18px 20px;
      margin-bottom:14px;
      box-shadow:var(--shadow2);
    }

    .caseTopToolbar h3{
      margin:0;
      font-size:22px;
      font-weight:950;
    }

    .caseTopToolbar p{
      margin:5px 0 0;
      color:var(--muted);
      font-weight:600;
      line-height:1.6;
    }

    .caseFilterBar{
      display:grid;
      grid-template-columns:2fr 1fr 1fr;
      gap:10px;
      margin-bottom:12px;
    }

    .clickableRow{
      cursor:pointer;
    }

    .clickableRow:hover td{
      background:#FFFCF6;
    }

    .caseDetailPanel{
      margin-top:14px;
    }

    .caseDetailGrid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:10px;
      margin-bottom:14px;
    }

    .caseInfoBox{
      background:#fff;
      border:1px solid var(--border);
      border-radius:18px;
      padding:15px;
    }

    .caseInfoBox span{
      display:block;
      color:var(--muted);
      font-size:13px;
      font-weight:900;
      margin-bottom:8px;
    }

    .caseInfoBox b{
      font-size:20px;
      font-weight:950;
    }

    .caseTabs{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
      margin-bottom:14px;
    }

    .caseTabCard{
      background:#FFFEFB;
      border:1px solid var(--border);
      border-radius:18px;
      padding:17px;
    }

    .caseTabCard h3{
      margin:0 0 12px;
      font-size:20px;
      font-weight:950;
    }

    .caseTabCard p{
      margin:0;
      color:var(--muted);
      line-height:1.8;
      font-weight:600;
    }

    .caseRows{
      display:grid;
      gap:9px;
    }

    .caseRows div{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:12px;
      background:#FBF7EF;
      border:1px solid var(--border);
      border-radius:14px;
    }

    .caseRows b{
      white-space:nowrap;
    }

    .caseRows span{
      color:var(--muted);
      text-align:right;
      line-height:1.6;
    }

    .badge{
      display:inline-flex;
      align-items:center;
      gap:5px;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:950;
      white-space:nowrap;
    }

    .badge.green{background:#EEF8F2;color:#23734F;}
    .badge.yellow{background:#FFF7DE;color:#8A6416;}
    .badge.orange{background:#FFF0E3;color:#B45A1B;}
    .badge.red{background:#FFF0F0;color:#B42318;}
    .badge.blue{background:#EEF4FF;color:#2E5AAC;}
    .badge.gray{background:#F4F1EA;color:#6F6A5E;}

    @media(max-width:900px){
      .caseTopToolbar,
      .caseRows div{
        display:block;
      }

      .caseFilterBar,
      .caseDetailGrid,
      .caseTabs{
        grid-template-columns:1fr;
      }

      .caseRows span{
        display:block;
        text-align:left;
        margin-top:4px;
      }
    }
  `;

  document.head.appendChild(style);
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

function escAttr(v) {
  return esc(v).replace(/'/g, "&#039;");
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
