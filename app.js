const $ = (id) => document.getElementById(id);

const pageMeta = {
  dashboard: {
    title: "首頁總覽",
    subtitle: "服務案件、地方互動、喪宅流程與團隊工作集中管理。"
  },
  cases: {
    title: "案件管理",
    subtitle: "以案件為中心，追蹤民眾陳情、處理流程、留言、照片與附件。"
  },
  archive: {
    title: "服務資料歸檔",
    subtitle: "所有服務對象、案件、互動與歷史紀錄集中歸檔。"
  },
  interactions: {
    title: "地方互動",
    subtitle: "以日期為主，紀錄外勤拜訪、地方情報、聊天內容與後續追蹤。"
  },
  funerals: {
    title: "喪宅系統",
    subtitle: "依出殯日期與未完成事項排序，追蹤輓聯、送水、公祭行程與位置。"
  },
  contacts: {
    title: "地方聯絡人",
    subtitle: "管理里長、主委、校長、宮廟、店家、社團與重要地方人士。"
  },
  calendar: {
    title: "行程管理",
    subtitle: "唯一行程中心，整合會勘、拜訪、公祭、婚宴、探病與會議。"
  },
  team: {
    title: "團隊管理",
    subtitle: "主管控制台，查看每位助理工作量、案件狀態與分派情形。"
  },
  settings: {
    title: "系統設定",
    subtitle: "管理帳號權限、分類、提醒、Google、LINE、備份與資料匯入匯出。"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindRecordSelection();
  bindCalendarSelection();
  bindQuickButtons();
});

function bindNavigation() {
  document.querySelectorAll(".nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      showPage(btn.dataset.page);
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll(".nav").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });

  const meta = pageMeta[pageId];

  if (meta) {
    if ($("pageTitle")) $("pageTitle").textContent = meta.title;
    if ($("pageSubtitle")) $("pageSubtitle").textContent = meta.subtitle;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function bindRecordSelection() {
  document.querySelectorAll(".recordList").forEach((list) => {
    list.addEventListener("click", (event) => {
      const item = event.target.closest(".recordItem");

      if (!item) return;

      list.querySelectorAll(".recordItem").forEach((row) => {
        row.classList.remove("active");
      });

      item.classList.add("active");

      toast("已選取", item.querySelector("strong")?.textContent || "資料");
    });
  });
}

function bindCalendarSelection() {
  document.querySelectorAll(".calendarGrid button, .bigCalendar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".calendarGrid, .bigCalendar");

      if (!parent) return;

      parent.querySelectorAll("button").forEach((b) => {
        b.classList.remove("active");
      });

      btn.classList.add("active");

      toast("日期切換", `已切換到 ${btn.textContent} 日`);
    });
  });
}

function bindQuickButtons() {
  document.querySelectorAll(".primaryBtn, .quickGrid button, .ghostBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.textContent.trim();

      if (!text) return;

      if (text.includes("全部案件")) {
        showPage("cases");
        return;
      }

      if (text.includes("新增案件")) {
        toast("新增案件", "下一步會開啟新增案件 Modal。");
        return;
      }

      if (text.includes("新增互動")) {
        toast("新增互動", "下一步會開啟地方互動 Modal。");
        return;
      }

      if (text.includes("新增喪宅")) {
        toast("新增喪宅", "下一步會開啟喪宅資料 Modal。");
        return;
      }

      if (text.includes("新增行程")) {
        toast("新增行程", "下一步會開啟行程 Modal。");
        return;
      }

      if (text.includes("搜尋")) {
        toast("搜尋", "全域搜尋功能下一階段加入。");
        return;
      }

      if (text.includes("快速新增")) {
        toast("快速新增", "下一階段會加入快速新增選單。");
        return;
      }
    });
  });
}

function toast(title, message = "") {
  let box = $("toastBox");

  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    box.className = "toastBox";
    document.body.appendChild(box);
  }

  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `
    <b>${escapeHtml(title)}</b>
    <span>${escapeHtml(message)}</span>
  `;

  box.appendChild(item);

  setTimeout(() => {
    item.classList.add("hide");
    setTimeout(() => item.remove(), 260);
  }, 1800);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}
