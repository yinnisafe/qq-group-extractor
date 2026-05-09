(() => {
  const PAGE_DELAY = 1500;
  const EXTRACT_DELAY = 1200;
  const MAX_RETRY = 3;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalizeText = (value) => (value || "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const all = [];
  const seen = new Set();
  let page = 1;

  const detectRole = (cells) => {
    const candidateIndexes = [2, 3];
    const roleWords = ["群主", "管理员", "成员"];
    for (const index of candidateIndexes) {
      const text = normalizeText(cells[index]?.innerText || "");
      if (roleWords.some((word) => text.includes(word))) {
        return roleWords.find((word) => text.includes(word)) || text;
      }
    }
    return "";
  };

  const parseRow = (tr) => {
    const cells = tr.querySelectorAll("td");
    const cell1Text = normalizeText(cells[1]?.innerText || "");

    let nickname = "";
    let qq = "";
    const qqMatch = cell1Text.match(/^([\s\S]*?)(?:\s+)?QQ[:：]?\s*(\d+)/i);
    if (qqMatch) {
      nickname = normalizeText(qqMatch[1]);
      qq = qqMatch[2];
    } else {
      nickname = cell1Text;
    }

    return {
      群昵称: nickname,
      QQ号: qq,
      角色: detectRole(cells),
      性别: normalizeText(cells[3]?.innerText || ""),
      Q龄: normalizeText(cells[4]?.innerText || ""),
      群等级: normalizeText(cells[5]?.innerText || ""),
      进群时间: normalizeText(cells[6]?.innerText || ""),
      最后发言: normalizeText(cells[7]?.innerText || ""),
    };
  };

  const extractCurrentPage = () => {
    const rows = Array.from(
      document.querySelectorAll(".t-table__body tr:not(.t-table__row--disabled)")
    );

    const pageRows = rows
      .map(parseRow)
      .filter((item) => item.群昵称 || item.QQ号);

    let added = 0;
    for (const item of pageRows) {
      const dedupKey = `${item.QQ号}|${item.群昵称}|${item.进群时间}`;
      if (seen.has(dedupKey)) {
        continue;
      }
      seen.add(dedupKey);
      all.push(item);
      added += 1;
    }

    console.log(`第 ${page} 页抓取 ${pageRows.length} 条，新增 ${added} 条`);
    return { pageRows: pageRows.length, added };
  };

  const goNextPage = async () => {
    const btn = document.querySelector(".t-pagination__btn-next:not(.t-is-disabled)");
    if (!btn) {
      return false;
    }
    const prevRowCount = document.querySelectorAll(".t-table__body tr:not(.t-table__row--disabled)").length;
    btn.click();
    for (let attempt = 0; attempt < MAX_RETRY; attempt += 1) {
      await sleep(PAGE_DELAY);
      const currentRows = document.querySelectorAll(".t-table__body tr:not(.t-table__row--disabled)");
      if (currentRows.length > 0) {
        const firstCellText = normalizeText(currentRows[0]?.querySelectorAll("td")[1]?.innerText || "");
        if (firstCellText) {
          return true;
        }
      }
    }
    return true;
  };

  const downloadBlob = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const exportJson = () => {
    downloadBlob(
      JSON.stringify(all, null, 2),
      "application/json;charset=utf-8",
      "qq_members.json"
    );
  };

  const exportCsv = () => {
    const headers = ["群昵称", "QQ号", "角色", "性别", "Q龄", "群等级", "进群时间", "最后发言"];
    const lines = [
      headers.join(","),
      ...all.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
    ];
    downloadBlob(lines.join("\n"), "text/csv;charset=utf-8", "qq_members.csv");
  };

  const getExpectedTotal = () => {
    const candidates = Array.from(document.querySelectorAll(".t-button__text, .t-pagination, .t-text"));
    const matched = candidates.find((el) => /成员人数|群成员人数/.test(el.textContent || ""));
    const count = matched?.textContent.match(/(\d+)/)?.[1];
    return count ? Number.parseInt(count, 10) : 0;
  };

  (async () => {
    const expected = getExpectedTotal();
    console.log("开始抓取群成员数据，预计人数：", expected || "未知");

    while (true) {
      await sleep(EXTRACT_DELAY);
      const { pageRows } = extractCurrentPage();
      if (pageRows === 0) {
        break;
      }
      if (!(await goNextPage())) {
        break;
      }
      page += 1;
    }

    console.log(`抓取完成，共 ${all.length} 条`);
    if (expected && all.length < expected) {
      console.warn(`实际抓到 ${all.length} 条，少于页面显示的 ${expected} 条，请检查是否翻页过快或页面结构变化。`);
    }

    exportJson();
    exportCsv();
    alert(`已导出 ${all.length} 条成员数据：qq_members.json 和 qq_members.csv`);
  })();
})();
