const BROWSER_SCRIPT = [
  "(() => {",
  "  const PAGE_DELAY = 1500;",
  "  const EXTRACT_DELAY = 1200;",
  "  const MAX_RETRY = 3;",
  "",
  "  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
  '  const normalizeText = (value) => (value || "").replace(/\\r?\\n+/g, " ").replace(/\\s+/g, " ").trim();',
  '  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, \'""\')}"`;',
  "",
  "  const all = [];",
  "  const seen = new Set();",
  "  let page = 1;",
  "",
  "  const detectRole = (cells) => {",
  "    const candidateIndexes = [2, 3];",
  '    const roleWords = ["群主", "管理员", "成员"];',
  "    for (const index of candidateIndexes) {",
  '      const text = normalizeText(cells[index]?.innerText || "");',
  "      if (roleWords.some((word) => text.includes(word))) {",
  "        return roleWords.find((word) => text.includes(word)) || text;",
  "      }",
  "    }",
  '    return "";',
  "  };",
  "",
  "  const parseRow = (tr) => {",
  '    const cells = tr.querySelectorAll("td");',
  '    const cell1Text = normalizeText(cells[1]?.innerText || "");',
  "",
  '    let nickname = "";',
  '    let qq = "";',
  "    const qqMatch = cell1Text.match(/^([\\s\\S]*?)(?:\\s+)?QQ[:：]?\\s*(\\d+)/i);",
  "    if (qqMatch) {",
  "      nickname = normalizeText(qqMatch[1]);",
  "      qq = qqMatch[2];",
  "    } else {",
  "      nickname = cell1Text;",
  "    }",
  "",
  "    return {",
  "      群昵称: nickname,",
  "      QQ号: qq,",
  "      角色: detectRole(cells),",
  '      性别: normalizeText(cells[3]?.innerText || ""),',
  '      Q龄: normalizeText(cells[4]?.innerText || ""),',
  '      群等级: normalizeText(cells[5]?.innerText || ""),',
  '      进群时间: normalizeText(cells[6]?.innerText || ""),',
  '      最后发言: normalizeText(cells[7]?.innerText || ""),',
  "    };",
  "  };",
  "",
  "  const extractCurrentPage = () => {",
  "    const rows = Array.from(",
  '      document.querySelectorAll(".t-table__body tr:not(.t-table__row--disabled)")',
  "    );",
  "",
  "    const pageRows = rows",
  "      .map(parseRow)",
  "      .filter((item) => item.群昵称 || item.QQ号);",
  "",
  "    let added = 0;",
  "    for (const item of pageRows) {",
  "      const dedupKey = `${item.QQ号}|${item.群昵称}|${item.进群时间}`;",
  "      if (seen.has(dedupKey)) {",
  "        continue;",
  "      }",
  "      seen.add(dedupKey);",
  "      all.push(item);",
  "      added += 1;",
  "    }",
  "",
  '    console.log(`第 ${page} 页抓取 ${pageRows.length} 条，新增 ${added} 条`);',
  "    return { pageRows: pageRows.length, added };",
  "  };",
  "",
  "  const goNextPage = async () => {",
  '    const btn = document.querySelector(".t-pagination__btn-next:not(.t-is-disabled)");',
  "    if (!btn) {",
  "      return false;",
  "    }",
  '    btn.click();',
  "    for (let attempt = 0; attempt < MAX_RETRY; attempt += 1) {",
  "      await sleep(PAGE_DELAY);",
  '      const currentRows = document.querySelectorAll(".t-table__body tr:not(.t-table__row--disabled)");',
  "      if (currentRows.length > 0) {",
  '        const firstCellText = normalizeText(currentRows[0]?.querySelectorAll("td")[1]?.innerText || "");',
  "        if (firstCellText) {",
  "          return true;",
  "        }",
  "      }",
  "    }",
  "    return true;",
  "  };",
  "",
  "  const downloadBlob = (content, type, filename) => {",
  "    const blob = new Blob([content], { type });",
  "    const url = URL.createObjectURL(blob);",
  '    const anchor = Object.assign(document.createElement("a"), {',
  "      href: url,",
  "      download: filename,",
  "    });",
  "    document.body.appendChild(anchor);",
  "    anchor.click();",
  "    anchor.remove();",
  "    setTimeout(() => URL.revokeObjectURL(url), 3000);",
  "  };",
  "",
  "  const exportJson = () => {",
  "    downloadBlob(",
  "      JSON.stringify(all, null, 2),",
  '      "application/json;charset=utf-8",',
  '      "qq_members.json"',
  "    );",
  "  };",
  "",
  "  const exportCsv = () => {",
  '    const headers = ["群昵称", "QQ号", "角色", "性别", "Q龄", "群等级", "进群时间", "最后发言"];',
  "    const lines = [",
  '      headers.join(","),',
  '      ...all.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),',
  "    ];",
  '    downloadBlob(lines.join("\\n"), "text/csv;charset=utf-8", "qq_members.csv");',
  "  };",
  "",
  "  const getExpectedTotal = () => {",
  '    const candidates = Array.from(document.querySelectorAll(".t-button__text, .t-pagination, .t-text"));',
  "    const matched = candidates.find((el) => /成员人数|群成员人数/.test(el.textContent || \"\"));",
  "    const count = matched?.textContent.match(/(\\d+)/)?.[1];",
  "    return count ? Number.parseInt(count, 10) : 0;",
  "  };",
  "",
  "  (async () => {",
  "    const expected = getExpectedTotal();",
  '    console.log("开始抓取群成员数据，预计人数：", expected || "未知");',
  "",
  "    while (true) {",
  "      await sleep(EXTRACT_DELAY);",
  "      const { pageRows } = extractCurrentPage();",
  "      if (pageRows === 0) {",
  "        break;",
  "      }",
  "      if (!(await goNextPage())) {",
  "        break;",
  "      }",
  "      page += 1;",
  "    }",
  "",
  '    console.log(`抓取完成，共 ${all.length} 条`);',
  "    if (expected && all.length < expected) {",
  '      console.warn(`实际抓到 ${all.length} 条，少于页面显示的 ${expected} 条，请检查是否翻页过快或页面结构变化。`);',
  "    }",
  "",
  "    exportJson();",
  "    exportCsv();",
  '    alert(`已导出 ${all.length} 条成员数据：qq_members.json 和 qq_members.csv`);',
  "  })();",
  "})();",
  "",
].join("\n");

const PAGE_SIZE = 12;
const FIELD_ALIASES = {
  nickname: "群昵称",
  qq: "QQ号",
  gender: "性别",
  qAge: "Q龄",
  level: "群等级",
  joinTime: "进群时间",
  lastMsgTime: "最后发言",
  role: "角色",
  card: "群名片",
  remark: "备注",
};
const DEFAULT_FIELDS = ["群昵称", "QQ号", "角色", "进群时间", "最后发言"];

const state = {
  sourceRows: [],
  headers: [],
  filteredRows: [],
  selectedFields: [],
  selectedRoles: new Set(),
  currentPage: 1,
};

const els = {
  memberFile: document.getElementById("member_file"),
  fileStatus: document.getElementById("file-status"),
  fieldsGrid: document.getElementById("fields-grid"),
  rolesGrid: document.getElementById("roles-grid"),
  deduplicateBy: document.getElementById("deduplicate_by"),
  keyword: document.getElementById("keyword"),
  outputFormat: document.getElementById("output_format"),
  delimiter: document.getElementById("delimiter"),
  includeHeader: document.getElementById("include_header"),
  previewBtn: document.getElementById("preview-btn"),
  downloadBtn: document.getElementById("download-btn"),
  totalRows: document.getElementById("total-rows"),
  filteredCount: document.getElementById("filtered-count"),
  pageIndicator: document.getElementById("page-indicator"),
  previewSummary: document.getElementById("preview-summary"),
  previewTable: document.getElementById("preview-table"),
  previewHead: document.getElementById("preview-head"),
  previewBody: document.getElementById("preview-body"),
  emptyState: document.getElementById("empty-state"),
  paginationBar: document.getElementById("pagination-bar"),
  pageNumbers: document.getElementById("page-numbers"),
  prevPageBtn: document.getElementById("prev-page-btn"),
  nextPageBtn: document.getElementById("next-page-btn"),
  selectedFieldRibbon: document.getElementById("selected-field-ribbon"),
  previewWrap: document.getElementById("preview-wrap"),
  browserScript: document.getElementById("browser-script"),
  copyBtn: document.getElementById("copy-script-btn"),
  copyStatus: document.getElementById("copy-status"),
  modal: document.getElementById("guide-modal"),
};

function normalizeHeader(header) {
  return String(header || "").trim().replace("﻿", "");
}

function unifyFieldKey(key) {
  const cleanKey = normalizeHeader(key);
  return FIELD_ALIASES[cleanKey] || cleanKey;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function detectDelimiter(text) {
  const candidates = [",", "\t", ";", "|"];
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  let best = ",";
  let bestCount = -1;

  candidates.forEach((delimiter) => {
    const count = firstLine.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  });

  return best;
}

function parseTextRows(text) {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalizedText) {
    throw new Error("文件中没有可处理的数据行。");
  }

  const delimiter = detectDelimiter(normalizedText);
  const lines = normalizedText.split("\n").filter((line) => line.trim());
  if (!lines.length) {
    throw new Error("无法识别表头，请确认第一行是字段名。");
  }

  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = String(values[index] || "").trim();
    });
    return row;
  }).filter((row) => Object.values(row).some(Boolean));

  if (!rows.length) {
    throw new Error("文件中没有可处理的数据行。");
  }

  return { rows, headers };
}

function parseJsonRows(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error("JSON 文件格式无效，请检查导出内容。");
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (Array.isArray(payload.members)) {
      payload = payload.members;
    } else if (Array.isArray(payload.data)) {
      payload = payload.data;
    }
  }

  if (!Array.isArray(payload) || !payload.length) {
    throw new Error("JSON 文件中没有可处理的数据。");
  }

  const headers = [];
  const headerSet = new Set();
  const rows = payload
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const row = {};
      Object.entries(item).forEach(([key, value]) => {
        const normalizedKey = unifyFieldKey(key);
        if (!headerSet.has(normalizedKey)) {
          headerSet.add(normalizedKey);
          headers.push(normalizedKey);
        }
        row[normalizedKey] = value == null ? "" : String(value).trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some(Boolean));

  if (!rows.length) {
    throw new Error("JSON 文件中没有有效成员记录。");
  }

  return { rows, headers };
}

function parseFileContent(text, filename) {
  const lowerName = String(filename || "").toLowerCase();
  if (lowerName.endsWith(".json")) {
    return parseJsonRows(text);
  }
  return parseTextRows(text);
}

function getDefaultFields(headers) {
  const matched = DEFAULT_FIELDS.filter((field) => headers.includes(field));
  return matched.length ? matched : headers.slice(0, Math.min(5, headers.length));
}

function renderFieldOptions() {
  if (!state.headers.length) {
    els.fieldsGrid.innerHTML = '<p class="hint">上传成员文件后，这里会自动列出可导出的字段。</p>';
    els.selectedFieldRibbon.textContent = "未选择";
    return;
  }

  els.fieldsGrid.innerHTML = state.headers
    .map(
      (field) => `
        <label class="chip">
          <input type="checkbox" class="field-checkbox" value="${escapeHtml(field)}" ${state.selectedFields.includes(field) ? "checked" : ""} />
          <span>${escapeHtml(field)}</span>
        </label>
      `
    )
    .join("");

  updateSelectedFieldRibbon();
}

function updateSelectedFieldRibbon() {
  if (!state.selectedFields.length) {
    els.selectedFieldRibbon.textContent = "未选择";
    return;
  }
  els.selectedFieldRibbon.textContent = state.selectedFields.join(" / ");
}

function renderRoleOptions() {
  const roles = Array.from(new Set(state.sourceRows.map((row) => row["角色"]).filter(Boolean))).sort();
  if (!roles.length) {
    els.rolesGrid.innerHTML = '<p class="hint">如果文件中包含"角色"列，上传后自动显示。</p>';
    state.selectedRoles = new Set();
    return;
  }

  els.rolesGrid.innerHTML = roles
    .map(
      (role) => `
        <label class="chip">
          <input type="checkbox" class="role-checkbox" value="${escapeHtml(role)}" ${state.selectedRoles.has(role) ? "checked" : ""} />
          <span>${escapeHtml(role)}</span>
        </label>
      `
    )
    .join("");
}

function renderDeduplicateOptions() {
  els.deduplicateBy.innerHTML = '<option value="">不去重</option>';
  state.headers.forEach((field) => {
    const option = document.createElement("option");
    option.value = field;
    option.textContent = field;
    els.deduplicateBy.appendChild(option);
  });
}

function syncSelectionsFromUi() {
  state.selectedFields = Array.from(document.querySelectorAll(".field-checkbox:checked")).map((input) => input.value);
  state.selectedRoles = new Set(Array.from(document.querySelectorAll(".role-checkbox:checked")).map((input) => input.value));
  updateSelectedFieldRibbon();
}

function applyFilters() {
  syncSelectionsFromUi();
  const keyword = els.keyword.value.trim().toLowerCase();
  const deduplicateBy = els.deduplicateBy.value;
  const seen = new Set();

  state.filteredRows = state.sourceRows.filter((row) => {
    if (state.selectedRoles.size) {
      const role = String(row["角色"] || "").trim();
      if (!state.selectedRoles.has(role)) {
        return false;
      }
    }

    if (keyword) {
      const searchFields = state.selectedFields.length ? state.selectedFields : state.headers;
      const matched = searchFields.some((field) => String(row[field] || "").toLowerCase().includes(keyword));
      if (!matched) {
        return false;
      }
    }

    if (deduplicateBy) {
      const value = String(row[deduplicateBy] || "").trim();
      if (value && seen.has(value)) {
        return false;
      }
      if (value) {
        seen.add(value);
      }
    }

    return true;
  });

  state.currentPage = 1;
}

function paginateRows(rows, page, pageSize) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  return {
    items: rows.slice(startIndex, endIndex),
    currentPage,
    totalPages,
    startIndex,
    endIndex,
  };
}

function buildPageNumbers(currentPage, totalPages, radius) {
  radius = radius || 2;
  const numbers = [];
  const start = Math.max(1, currentPage - radius);
  const end = Math.min(totalPages, currentPage + radius);
  for (let page = start; page <= end; page += 1) {
    numbers.push(page);
  }
  return numbers;
}

function renderPreview() {
  const selectedFields = state.selectedFields.length ? state.selectedFields : getDefaultFields(state.headers);
  const { items, currentPage, totalPages, startIndex, endIndex } = paginateRows(state.filteredRows, state.currentPage, PAGE_SIZE);
  state.currentPage = currentPage;

  els.totalRows.textContent = String(state.sourceRows.length);
  els.filteredCount.textContent = String(state.filteredRows.length);
  els.pageIndicator.textContent = currentPage + "/" + totalPages;

  if (!state.filteredRows.length) {
    els.previewTable.hidden = true;
    els.emptyState.hidden = false;
    els.paginationBar.hidden = true;
    els.previewSummary.textContent = state.sourceRows.length
      ? "当前筛选条件下没有匹配结果，请调整条件后重试。"
      : "上传文件后点击预览按钮查看结果。";
    return;
  }

  els.emptyState.hidden = true;
  els.previewTable.hidden = false;
  els.previewHead.innerHTML = selectedFields.map((field) => "<th>" + escapeHtml(field) + "</th>").join("");
  els.previewBody.innerHTML = items
    .map(
      (row) =>
        "<tr>" +
        selectedFields.map((field) => "<td>" + escapeHtml(row[field] || "") + "</td>").join("") +
        "</tr>"
    )
    .join("");

  els.previewSummary.textContent = "第 " + (startIndex + 1) + " - " + endIndex + " 条，共 " + state.filteredRows.length + " 条结果";
  renderPagination(currentPage, totalPages);
}

function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) {
    els.paginationBar.hidden = true;
    return;
  }

  els.paginationBar.hidden = false;
  els.prevPageBtn.disabled = currentPage <= 1;
  els.nextPageBtn.disabled = currentPage >= totalPages;
  els.pageNumbers.innerHTML = buildPageNumbers(currentPage, totalPages)
    .map(
      (page) =>
        '<button type="button" class="page-number' + (page === currentPage ? " is-active" : "") + '" data-page="' + page + '">' +
        page +
        "</button>"
    )
    .join("");
}

function scrollToResults() {
  var panel = document.getElementById("result-panel");
  if (!panel) {
    return;
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildExportRows() {
  const selectedFields = state.selectedFields.length ? state.selectedFields : getDefaultFields(state.headers);
  return state.filteredRows.map((row) => {
    const item = {};
    selectedFields.forEach((field) => {
      item[field] = row[field] || "";
    });
    return item;
  });
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
}

function exportRows() {
  if (!state.filteredRows.length) {
    alert("当前没有可导出的成员结果，请先上传文件并预览。");
    return;
  }

  const selectedFields = state.selectedFields.length ? state.selectedFields : getDefaultFields(state.headers);
  const rows = buildExportRows();
  const format = els.outputFormat.value;
  const delimiterInput = els.delimiter.value || ",";
  const delimiter = delimiterInput === "\\t" ? "\t" : delimiterInput[0];
  const includeHeader = els.includeHeader.checked;

  if (format === "json") {
    downloadBlob(JSON.stringify(rows, null, 2), "application/json;charset=utf-8", "group_members.json");
    return;
  }

  if (format === "txt") {
    const lines = [];
    if (includeHeader) {
      lines.push(selectedFields.join(delimiter));
    }
    rows.forEach(function (row) {
      lines.push(selectedFields.map(function (field) { return row[field] || ""; }).join(delimiter));
    });
    downloadBlob(lines.join("\n"), "text/plain;charset=utf-8", "group_members.txt");
    return;
  }

  const csvEscape = function (value) { return '"' + String(value ?? "").replace(/"/g, '""') + '"'; };
  const csvLines = [];
  if (includeHeader) {
    csvLines.push(selectedFields.map(csvEscape).join(","));
  }
  rows.forEach(function (row) {
    csvLines.push(selectedFields.map(function (field) { return csvEscape(row[field] || ""); }).join(","));
  });
  downloadBlob(csvLines.join("\n"), "text/csv;charset=utf-8", "group_members.csv");
}

function loadBrowserScript() {
  els.browserScript.textContent = BROWSER_SCRIPT;
}

function openGuideModal() {
  els.modal.hidden = false;
  els.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeGuideModal() {
  els.modal.hidden = true;
  els.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = parseFileContent(text, file.name);
    state.sourceRows = parsed.rows;
    state.headers = parsed.headers;
    state.selectedFields = getDefaultFields(parsed.headers);
    state.selectedRoles = new Set();
    state.filteredRows = [...parsed.rows];
    state.currentPage = 1;

    renderFieldOptions();
    renderRoleOptions();
    renderDeduplicateOptions();
    renderPreview();

    els.fileStatus.textContent = "已载入 " + file.name + "，共 " + parsed.rows.length + " 条成员数据。";
    scrollToResults();
  } catch (error) {
    alert(error.message || "文件处理失败，请检查格式。");
  }
}

function handlePreview() {
  if (!state.sourceRows.length) {
    alert("请先上传成员文件。");
    return;
  }
  applyFilters();
  renderPreview();
  scrollToResults();
}

function attachEvents() {
  els.memberFile.addEventListener("change", handleFileUpload);
  els.previewBtn.addEventListener("click", handlePreview);
  els.downloadBtn.addEventListener("click", exportRows);

  els.fieldsGrid.addEventListener("change", function (event) {
    if (event.target.classList.contains("field-checkbox")) {
      syncSelectionsFromUi();
      renderPreview();
    }
  });

  els.rolesGrid.addEventListener("change", function (event) {
    if (event.target.classList.contains("role-checkbox")) {
      applyFilters();
      renderPreview();
    }
  });

  var debouncedKeywordFilter = debounce(function () {
    if (!state.sourceRows.length) {
      return;
    }
    applyFilters();
    renderPreview();
  }, 300);

  els.keyword.addEventListener("input", debouncedKeywordFilter);

  els.deduplicateBy.addEventListener("change", function () {
    if (!state.sourceRows.length) {
      return;
    }
    applyFilters();
    renderPreview();
  });

  els.prevPageBtn.addEventListener("click", function () {
    state.currentPage = Math.max(1, state.currentPage - 1);
    renderPreview();
    scrollToResults();
  });

  els.nextPageBtn.addEventListener("click", function () {
    var totalPages = Math.max(1, Math.ceil(state.filteredRows.length / PAGE_SIZE));
    state.currentPage = Math.min(totalPages, state.currentPage + 1);
    renderPreview();
    scrollToResults();
  });

  els.pageNumbers.addEventListener("click", function (event) {
    var button = event.target.closest(".page-number");
    if (!button) {
      return;
    }
    state.currentPage = Number(button.dataset.page || 1);
    renderPreview();
    scrollToResults();
  });

  if (els.copyBtn && els.copyStatus) {
    els.copyBtn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(BROWSER_SCRIPT);
        els.copyStatus.textContent = "已复制，切换到浏览器控制台粘贴运行。";
        els.copyBtn.textContent = "已复制";
        setTimeout(function () {
          els.copyBtn.textContent = "复制脚本";
          els.copyStatus.textContent = "";
        }, 2200);
      } catch (error) {
        els.copyStatus.textContent = "复制失败，请展开脚本后手动复制。";
      }
    });
  }

  // Modal: simplified to single open / close button pairs
  var openGuideBtn = document.getElementById("open-guide-btn");
  if (openGuideBtn) {
    openGuideBtn.addEventListener("click", openGuideModal);
  }

  var closeGuideBtn = document.getElementById("close-guide-btn");
  var closeGuideBtnBottom = document.getElementById("close-guide-btn-bottom");
  if (closeGuideBtn) closeGuideBtn.addEventListener("click", closeGuideModal);
  if (closeGuideBtnBottom) closeGuideBtnBottom.addEventListener("click", closeGuideModal);

  els.modal.addEventListener("click", function (event) {
    if (event.target === els.modal) {
      closeGuideModal();
    }
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !els.modal.hidden) {
      closeGuideModal();
    }
  });
}

function init() {
  loadBrowserScript();
  attachEvents();
  renderPreview();
}

init();
