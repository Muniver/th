/* ============================================================
   بوابة نتيجة الثانوية العامة — منطق التطبيق
   كل المعالجة تتم داخل المتصفح، لا يوجد أي إرسال بيانات لسيرفر.
   ============================================================ */

/* ---------------------------------------------------------------
   1) جدول تنسيق تقريبي/استرشادي فقط (ليس رسميًا). عدّل الأرقام هنا
   بسهولة لو معاك أرقام تنسيق رسمية حديثة عايز تستخدمها بدل التقريبية.
   القيم = أقل نسبة مئوية تقريبية مطلوبة تاريخيًا لكل كلية.
--------------------------------------------------------------- */
const COLLEGE_TABLES = {
  science_math: [
    { name: "هندسة (جامعات كبرى - قاهرة/عين شمس/إسكندرية)", min: 93 },
    { name: "حاسبات ومعلومات / ذكاء اصطناعي", min: 90 },
    { name: "طب - قسم رياضة (بعض الجامعات)", min: 96 },
    { name: "اقتصاد وعلوم سياسية", min: 92 },
    { name: "علوم (شعبة رياضة)", min: 78 },
    { name: "هندسة (جامعات إقليمية)", min: 82 },
    { name: "تجارة (شعبة إحصاء/رياضة)", min: 75 },
    { name: "حقوق", min: 74 },
    { name: "تربية (رياضيات)", min: 76 },
    { name: "زراعة / تكنولوجيا الأغذية", min: 68 },
    { name: "سياحة وفنادق", min: 66 },
    { name: "تربية رياضية / نوعية", min: 62 },
  ],
  science_science: [
    { name: "طب بشري (جامعات كبرى)", min: 96 },
    { name: "طب أسنان", min: 94 },
    { name: "صيدلة", min: 90 },
    { name: "علاج طبيعي", min: 89 },
    { name: "بيطري", min: 84 },
    { name: "علوم (كيمياء/أحياء/جيولوجيا)", min: 75 },
    { name: "صيدلة (جامعات إقليمية/خاصة بمصروفات)", min: 80 },
    { name: "تمريض", min: 70 },
    { name: "زراعة", min: 66 },
    { name: "تربية (علوم)", min: 74 },
    { name: "علاج طبيعي (جامعات إقليمية)", min: 82 },
    { name: "تكنولوجيا العلاج الطبيعي / علوم صحية", min: 72 },
  ],
  literary: [
    { name: "حقوق (جامعات كبرى)", min: 84 },
    { name: "اقتصاد وعلوم سياسية", min: 90 },
    { name: "آداب (لغات)", min: 78 },
    { name: "إعلام", min: 82 },
    { name: "تجارة", min: 72 },
    { name: "دار العلوم", min: 74 },
    { name: "تربية (لغة عربية/إنجليزي)", min: 76 },
    { name: "آداب (تاريخ/جغرافيا/اجتماع)", min: 65 },
    { name: "خدمة اجتماعية", min: 62 },
    { name: "سياحة وفنادق", min: 63 },
    { name: "تربية نوعية", min: 60 },
    { name: "رياض أطفال", min: 68 },
  ],
};

/* ---------------------------------------------------------------
   2) حالة التطبيق
--------------------------------------------------------------- */
const state = {
  seats: null,        // Int32Array
  names: [],           // string[]
  scores: null,        // Float32Array
  cflag: null,          // Uint8Array
  statusCode: null,     // Uint8Array  0 ناجح دور أول, 1 دور ثان, 2 راسب, 3 غياب, 4 غير معروف
  n: 0,
  seatIndex: new Map(), // seat -> row index
  totalMax: 410,
  track: "unknown",
  groups: {},           // groupKey -> { indices sorted desc by score (Float32Array of scores), countMap: Map, total, passTotal, top }
};

const STATUS_LABELS = ["ناجح دور أول", "دور ثانٍ", "راسب دور أول", "غياب كلي دور أول", "غير محدد"];

/* ---------------------------------------------------------------
   3) عناصر DOM
--------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const els = {
  progressWrap: $("progressWrap"), progressText: $("progressText"),
  progressPct: $("progressPct"), progressFill: $("progressFill"),
  errorNote: $("errorNote"), loadingTitle: $("loadingTitle"), loadingSub: $("loadingSub"),
  loadingSpinner: $("loadingSpinner"),
  viewUpload: $("view-upload"), viewSearch: $("view-search"),
  viewResult: $("view-result"), viewTop: $("view-top"),
  topActions: $("topActions"), navSearch: $("navSearch"), navTop: $("navTop"),
  statStrip: $("statStrip"),
  searchInput: $("searchInput"), searchBtn: $("searchBtn"),
  resultsList: $("resultsList"), hintLine: $("hintLine"),
  certificate: $("certificate"), backToSearch: $("backToSearch"),
  backFromTop: $("backFromTop"), topList: $("topList"),
};

let searchMode = "seat";

/* ---------------------------------------------------------------
   4) اسم ملف بيانات النتيجة على السيرفر
   -----------------------------------------------------------------
   حط ملف النتيجة (Excel) بجوار index.html و app.js وسمّه بنفس
   الاسم اللي تحت (DATA_FILE)، أو غيّر الاسم هنا ليطابق اسم ملفك.
   الموقع لازم يتفتح من على سيرفر حقيقي (استضافة / GitHub Pages...)
   مش بفتح ملف index.html مباشرة من على جهازك، عشان المتصفح بيمنع
   تحميل ملفات محلية بأمر fetch لأسباب أمان.
--------------------------------------------------------------- */
const DATA_FILE = "data.xlsx";

function showError(msg) { els.errorNote.innerHTML = msg; els.errorNote.classList.add("show"); }
function hideError() { els.errorNote.classList.remove("show"); }

function setProgress(pct, text) {
  els.progressWrap.classList.add("show");
  els.progressFill.style.width = pct + "%";
  els.progressPct.textContent = pct + "%";
  if (text) els.progressText.textContent = text;
}

/* ---------------------------------------------------------------
   5) تحميل وتحليل ملف النتيجة تلقائيًا عند فتح الموقع
--------------------------------------------------------------- */
async function init() {
  hideError();
  try {
    setProgress(8, "جاري الاتصال بقاعدة البيانات…");
    const res = await fetch(DATA_FILE, { cache: "no-store" });
    if (!res.ok) throw new Error("http_" + res.status);

    const total = Number(res.headers.get("content-length")) || 0;
    let loaded = 0;
    const reader = res.body ? res.body.getReader() : null;
    let buffer;
    if (reader) {
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) setProgress(8 + Math.round((loaded / total) * 42), "جاري تحميل بيانات النتيجة…");
      }
      const merged = new Uint8Array(loaded);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      buffer = merged;
    } else {
      setProgress(30, "جاري تحميل بيانات النتيجة…");
      buffer = new Uint8Array(await res.arrayBuffer());
    }

    setProgress(55, "جاري تحليل بيانات الطلاب…");
    els.loadingTitle.textContent = "جاري تحليل بيانات الطلاب…";
    await nextFrame();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = pickBestSheet(wb);
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
    if (!rows.length) throw new Error("empty_file");

    setProgress(72, "جاري بناء الفهارس…");
    els.loadingTitle.textContent = "جاري بناء فهارس الاستعلام…";
    await nextFrame();
    buildState(rows);
  } catch (err) {
    console.error(err);
    if (err && String(err.message).startsWith("http_")) {
      showError(`تعذر العثور على ملف بيانات النتيجة. تأكد إن ملف الإكسل موجود بجوار الموقع باسم <code>${DATA_FILE}</code>.`);
    } else if (location.protocol === "file:") {
      showError("لازم تفتح الموقع من على سيرفر (استضافة حقيقية) مش بفتح الملف مباشرة من جهازك، عشان المتصفح بيمنع قراءة الملفات المحلية.");
    } else {
      showError("تعذر تحليل ملف النتيجة. تأكد أنه ملف إكسل صالح وبنفس الأعمدة المتوقعة.");
    }
    els.loadingSpinner.style.display = "none";
    els.loadingTitle.textContent = "تعذر تحميل النتيجة";
    els.loadingSub.textContent = "";
  }
}
function nextFrame() { return new Promise((r) => setTimeout(r, 30)); }

function pickBestSheet(wb) {
  // يختار أول شيت يحتوي على عمود يشبه "رقم الجلوس"
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws["!ref"];
    if (!ref) continue;
    const firstRow = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, raw: true })[0] || [];
    const joined = firstRow.map((c) => String(c || "")).join("|");
    if (joined.includes("جلوس") || joined.includes("seat")) return name;
  }
  return wb.SheetNames[0];
}

function findCol(headerRow, keywords) {
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || "").toLowerCase();
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

function classifyStatus(raw) {
  if (!raw) return 4;
  const s = String(raw).trim();
  if (s.includes("ناجح")) return 0;
  if (s.includes("دور ثان") || s.includes("الدور الثاني") || s.includes("دور ثانى")) return 1;
  if (s.includes("راسب")) return 2;
  if (s.includes("غياب")) return 3;
  return 4;
}

function buildState(rows) {
  const header = rows[0];
  const seatCol = findCol(header, ["جلوس", "seat"]);
  const nameCol = findCol(header, ["اسم", "name"]);
  const scoreCol = findCol(header, ["درجة", "مجموع", "score", "total"]);
  const statusCol = findCol(header, ["حالة", "case_desc", "الوصف", "status"]);
  const flagCol = findCol(header, ["c_flage", "flag", "فئة"]);

  if (seatCol === -1 || nameCol === -1 || scoreCol === -1) {
    showError("ملف النتيجة لا يحتوي على أعمدة (رقم الجلوس / الاسم / الدرجة) المتوقعة.");
    els.loadingSpinner.style.display = "none";
    els.loadingTitle.textContent = "تعذر تحميل النتيجة";
    els.loadingSub.textContent = "";
    return;
  }

  const n = rows.length - 1;
  const seats = new Int32Array(n);
  const scores = new Float32Array(n);
  const cflag = new Uint8Array(n);
  const statusCode = new Uint8Array(n);
  const names = new Array(n);
  const seatIndex = new Map();

  let valid = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const seat = parseInt(r[seatCol], 10);
    if (!Number.isFinite(seat)) continue;
    const idx = valid;
    seats[idx] = seat;
    names[idx] = String(r[nameCol] || "").trim();
    const sc = parseFloat(r[scoreCol]);
    scores[idx] = Number.isFinite(sc) ? sc : NaN;
    cflag[idx] = flagCol !== -1 ? (parseInt(r[flagCol], 10) || 1) : 1;
    statusCode[idx] = statusCol !== -1 ? classifyStatus(r[statusCol]) : (Number.isFinite(sc) && sc > 0 ? 0 : 4);
    seatIndex.set(seat, idx);
    valid++;
  }

  state.n = valid;
  state.seats = seats.slice(0, valid);
  state.names = names.slice(0, valid);
  state.scores = scores.slice(0, valid);
  state.cflag = cflag.slice(0, valid);
  state.statusCode = statusCode.slice(0, valid);
  state.seatIndex = seatIndex;

  setProgress(90, "جاري حساب الترتيب والإحصائيات…");
  setTimeout(() => {
    buildGroups();
    setProgress(100, "تم!");
    setTimeout(() => {
      renderStatStrip();
      switchView("search");
      els.topActions.hidden = false;
    }, 250);
  }, 40);
}

document.addEventListener("DOMContentLoaded", init);

/* ---------------------------------------------------------------
   6) بناء مجموعات الترتيب حسب c_flag (نظام التقييم)
--------------------------------------------------------------- */
function buildGroups() {
  state.groups = {};
  const byFlag = new Map();
  for (let i = 0; i < state.n; i++) {
    if (state.statusCode[i] !== 0) continue; // الترتيب على الناجحين فقط
    const f = state.cflag[i];
    if (!byFlag.has(f)) byFlag.set(f, []);
    byFlag.get(f).push(state.scores[i]);
  }
  for (const [f, arr] of byFlag.entries()) {
    arr.sort((a, b) => b - a); // تنازلي
    const countMap = new Map();
    for (const s of arr) {
      const key = Math.round(s * 100) / 100;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }
    state.groups[f] = {
      sorted: Float32Array.from(arr),
      countMap,
      total: arr.length,
      top: arr[0] || 0,
      max: Math.max(...arr, 0),
    };
  }
  // إجمالي أعم للعرض في الشريط الإحصائي
  state.totalMax = state.groups[1] ? Math.max(410, Math.ceil(state.groups[1].max / 10) * 10) : 410;
}

function rankInGroup(flag, score) {
  const g = state.groups[flag];
  if (!g || !Number.isFinite(score)) return null;
  // عدد العناصر الأكبر تمامًا من score عبر بحث ثنائي في مصفوفة تنازلية
  let lo = 0, hi = g.sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (g.sorted[mid] > score) lo = mid + 1; else hi = mid;
  }
  return { rank: lo + 1, total: g.total };
}

function sameScoreCount(flag, score) {
  const g = state.groups[flag];
  if (!g || !Number.isFinite(score)) return 0;
  const key = Math.round(score * 100) / 100;
  return g.countMap.get(key) || 0;
}

/* ---------------------------------------------------------------
   7) شريط الإحصائيات العامة
--------------------------------------------------------------- */
function renderStatStrip() {
  const total = state.n;
  const g1 = state.groups[1];
  const passCount = (g1 ? g1.total : 0) +
    (state.groups[2] ? state.groups[2].total : 0) +
    (state.groups[3] ? state.groups[3].total : 0);
  const passPct = total ? ((passCount / total) * 100).toFixed(1) : "0";
  const top = g1 ? g1.top : 0;

  els.statStrip.innerHTML = `
    <div class="stat-card"><div class="num-big num">${total.toLocaleString("en-US")}</div><div class="num-lbl">إجمالي الطلاب</div></div>
    <div class="stat-card"><div class="num-big num">${passPct}%</div><div class="num-lbl">نسبة النجاح</div></div>
    <div class="stat-card"><div class="num-big num">${top.toFixed(1)}</div><div class="num-lbl">أعلى مجموع (نظام عام)</div></div>
    <div class="stat-card"><div class="num-big num">${(g1 ? g1.total : 0).toLocaleString("en-US")}</div><div class="num-lbl">ناجحون - نظام عام</div></div>
  `;
}

/* ---------------------------------------------------------------
   8) التنقل بين الشاشات
--------------------------------------------------------------- */
function switchView(name) {
  els.viewUpload.hidden = name !== "upload";
  els.viewSearch.hidden = name !== "search";
  els.viewResult.hidden = name !== "result";
  els.viewTop.hidden = name !== "top";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
els.navSearch.addEventListener("click", () => switchView("search"));
els.navTop.addEventListener("click", () => { renderTopList(); switchView("top"); });
els.backToSearch.addEventListener("click", () => switchView("search"));
els.backFromTop.addEventListener("click", () => switchView("search"));

/* ---------------------------------------------------------------
   9) البحث
--------------------------------------------------------------- */
document.querySelectorAll(".stab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".stab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    searchMode = tab.dataset.mode;
    els.searchInput.value = "";
    els.resultsList.innerHTML = "";
    if (searchMode === "seat") {
      els.searchInput.placeholder = "اكتب رقم الجلوس…";
      els.searchInput.inputMode = "numeric";
      els.hintLine.textContent = "اكتب رقم الجلوس بالكامل ثم اضغط بحث أو Enter";
    } else {
      els.searchInput.placeholder = "اكتب الاسم (3 أحرف على الأقل)…";
      els.searchInput.inputMode = "text";
      els.hintLine.textContent = "اكتب جزء من الاسم (3 أحرف على الأقل) ثم اضغط بحث أو Enter";
    }
  });
});

els.searchBtn.addEventListener("click", runSearch);
els.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

function normalizeArabic(s) {
  return String(s || "")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function runSearch() {
  const q = els.searchInput.value.trim();
  els.resultsList.innerHTML = "";
  if (!q) return;

  if (searchMode === "seat") {
    const seat = parseInt(q, 10);
    if (!Number.isFinite(seat) || !state.seatIndex.has(seat)) {
      els.resultsList.innerHTML = `<div class="empty-note">لا يوجد طالب برقم الجلوس "${escapeHtml(q)}"</div>`;
      return;
    }
    openResult(state.seatIndex.get(seat));
    return;
  }

  // بحث بالاسم
  if (q.length < 3) {
    els.resultsList.innerHTML = `<div class="empty-note">اكتب 3 أحرف على الأقل للبحث بالاسم</div>`;
    return;
  }
  const nq = normalizeArabic(q);
  const matches = [];
  for (let i = 0; i < state.n; i++) {
    if (normalizeArabic(state.names[i]).includes(nq)) {
      matches.push(i);
      if (matches.length >= 60) break;
    }
  }
  if (!matches.length) {
    els.resultsList.innerHTML = `<div class="empty-note">لا توجد نتائج مطابقة لـ "${escapeHtml(q)}"</div>`;
    return;
  }
  els.resultsList.innerHTML = matches
    .map((i) => {
      const s = state.scores[i];
      return `<div class="result-row" data-idx="${i}">
        <div>
          <div class="rr-name">${escapeHtml(state.names[i])}</div>
          <div class="rr-meta">رقم الجلوس: <span class="num">${state.seats[i]}</span> · ${STATUS_LABELS[state.statusCode[i]]}</div>
        </div>
        <div class="rr-score num">${Number.isFinite(s) ? s.toFixed(1) : "-"}</div>
      </div>`;
    })
    .join("") + (matches.length >= 60 ? `<div class="empty-note">تم عرض أول 60 نتيجة، دقّق البحث لتضييق النتائج</div>` : "");

  els.resultsList.querySelectorAll(".result-row").forEach((row) => {
    row.addEventListener("click", () => openResult(parseInt(row.dataset.idx, 10)));
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------------------
   10) شهادة النتيجة (الكارت الاحترافي)
--------------------------------------------------------------- */
const STATUS_STYLE = [
  { cls: "pass", icon: "✓" },
  { cls: "retake", icon: "↻" },
  { cls: "fail", icon: "✕" },
  { cls: "absent", icon: "–" },
  { cls: "absent", icon: "?" },
];

function todayArabic() {
  const d = new Date();
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function openResult(idx) {
  state.currentIdx = idx;
  const seat = state.seats[idx];
  const name = state.names[idx];
  const score = state.scores[idx];
  const status = state.statusCode[idx];
  const flag = state.cflag[idx];
  const st = STATUS_STYLE[status];
  const isPass = status === 0;

  const isStandard = flag === 1;
  const totalMax = isStandard ? 410 : (state.groups[flag] ? Math.ceil(state.groups[flag].max / 10) * 10 : null);
  const pct = totalMax && Number.isFinite(score) ? (score / totalMax) * 100 : null;
  const pctRing = pct !== null ? Math.min(100, Math.max(0, pct)) : 0;

  /* ---------- شهادة التقدير (تُطبع بمفردها) ---------- */
  const awardHtml = `
    <div class="award" id="awardBlock">
      <div class="award-corner tl">${CORNER_SVG}</div>
      <div class="award-corner tr">${CORNER_SVG}</div>
      <div class="award-corner bl">${CORNER_SVG}</div>
      <div class="award-corner br">${CORNER_SVG}</div>
      <div class="award-inner">
        <div class="award-seal-top">
          ${isPass
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>'}
        </div>
        <div class="award-eyebrow">Natega Thanawya 2026</div>
        <div class="award-title">${isPass ? "شهادة تقدير" : "إفادة استعلام نتيجة"}</div>
        <div class="award-lead">${isPass ? "تُمنح هذه الشهادة إلى" : "الطالب / الطالبة"}</div>
        <div class="award-name">${escapeHtml(name)}</div>
        <div class="award-seat">رقم الجلوس: <span class="num">${seat}</span></div>

        <div class="award-divider"></div>

        <div class="award-body">
          ${isPass
            ? `تقديرًا لجهوده واجتهاده، وتهنئةً بنجاحه في امتحان الثانوية العامة بمجموع كلي قدره
               <b>${Number.isFinite(score) ? score.toFixed(1) : "-"}</b>${totalMax ? ` من <b>${totalMax}</b>` : ""}
               ${pct !== null ? `بنسبة مئوية <b>${pct.toFixed(1)}%</b>` : ""}،
               متمنين له مزيدًا من التفوق والنجاح في مسيرته القادمة.`
            : `نُفيدكم بأن حالة الطالب المُسجّلة في نتيجة الثانوية العامة هي
               <b>${STATUS_LABELS[status]}</b>${Number.isFinite(score) ? `، بمجموع درجات <b>${score.toFixed(1)}</b>${totalMax ? ` من <b>${totalMax}</b>` : ""}` : ""}.`}
        </div>

        <div class="award-footer">
          <div class="award-sign"><div class="line">Natega Thanawya</div><div class="label">الجهة الناشرة للنتيجة</div></div>
          <div class="award-date">${todayArabic()}</div>
          <div class="award-sign"><div class="line">2026</div><div class="label">تاريخ الإصدار</div></div>
        </div>
      </div>
    </div>
    <div class="award-print-row"><button class="btn-gold" id="printAwardBtn">🖶 طباعة / حفظ الشهادة PDF</button></div>
  `;

  /* ---------- التفاصيل الكاملة (ترتيب + تنسيق) ---------- */
  let rankBlock = "", collegeBlock = "";
  if (isPass && Number.isFinite(score)) {
    const rk = rankInGroup(flag, score);
    const sameCount = sameScoreCount(flag, score);
    rankBlock = `
      <div class="metric-grid">
        <div class="metric"><div class="num-big num">${rk ? rk.rank.toLocaleString("en-US") : "-"}</div><div class="num-lbl">الترتيب على الجمهورية${isStandard ? "" : " (فئة النظام الخاص)"}</div></div>
        <div class="metric"><div class="num-big num">${rk ? rk.total.toLocaleString("en-US") : "-"}</div><div class="num-lbl">إجمالي الناجحين بنفس الفئة</div></div>
        <div class="metric"><div class="num-big num">${sameCount.toLocaleString("en-US")}</div><div class="num-lbl">طالب حاصل على نفس المجموع</div></div>
      </div>`;

    if (isStandard && pct !== null) {
      collegeBlock = renderCollegeBlock(pct);
    } else {
      collegeBlock = `<div class="section-title"><span class="dot"></span>توقع التنسيق</div>
        <div class="disclaimer">هذا الرقم مسجّل ضمن فئة تقييم خاصة مختلفة عن النظام العام، فلا يمكن حساب توقع تنسيق دقيق له هنا.</div>`;
    }
  }

  const detailsHtml = `
    <div class="certificate">
      <div class="cert-top">
        <div>
          <div class="cert-eyebrow">تفاصيل النتيجة</div>
          <div class="cert-name">${escapeHtml(name)}</div>
          <div class="cert-seat">رقم الجلوس: <span class="num">${seat}</span></div>
          <div style="margin-top:10px;">
            <span class="status-badge ${st.cls}">${st.icon} ${STATUS_LABELS[status]}</span>
          </div>
        </div>
        <div class="seal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>

      ${Number.isFinite(score) ? `
      <div class="score-hero">
        <div class="score-main">
          <div class="num-big num">${score.toFixed(1)} ${totalMax ? `<small>/ ${totalMax}</small>` : ""}</div>
          <div class="num-lbl">المجموع الكلي للدرجات</div>
        </div>
        ${pct !== null ? `
        <div class="score-pct">
          <div class="ring" style="--p:${pctRing}"><div class="ring-inner num">${pct.toFixed(1)}%</div></div>
          <div class="num-lbl">النسبة المئوية</div>
        </div>` : ""}
      </div>` : `<div class="disclaimer" style="margin-top:20px;">لا توجد درجة مسجّلة لهذا الطالب في الملف.</div>`}

      ${rankBlock}
      ${collegeBlock}

      <div class="print-row">
        <button class="btn-outline" id="printBtn">طباعة / حفظ التفاصيل PDF</button>
        <button class="btn-solid" id="newSearchBtn">استعلام جديد</button>
      </div>
    </div>
  `;

  els.certificate.innerHTML = `
    ${awardHtml}
    <button class="details-toggle" id="detailsToggle" type="button">
      عرض تفاصيل الترتيب وتوقع التنسيق
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="details-wrap" id="detailsWrap">${detailsHtml}</div>
  `;

  switchView("result");

  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  const printAwardBtn = document.getElementById("printAwardBtn");
  if (printAwardBtn) printAwardBtn.addEventListener("click", () => {
    document.body.classList.add("print-cert-only");
    window.print();
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("print-cert-only"));

  const newSearchBtn = document.getElementById("newSearchBtn");
  if (newSearchBtn) newSearchBtn.addEventListener("click", () => switchView("search"));

  const detailsToggle = document.getElementById("detailsToggle");
  const detailsWrap = document.getElementById("detailsWrap");
  if (detailsToggle && detailsWrap) {
    detailsToggle.addEventListener("click", () => {
      const open = detailsWrap.classList.toggle("open");
      detailsToggle.classList.toggle("open", open);
      detailsToggle.firstChild.textContent = open ? "إخفاء تفاصيل الترتيب وتوقع التنسيق " : "عرض تفاصيل الترتيب وتوقع التنسيق ";
    });
  }

  els.certificate.querySelectorAll(".track-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.track = btn.dataset.track;
      openResult(state.currentIdx);
    });
  });
}

const CORNER_SVG = '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 20V6a4 4 0 014-4h14" stroke-linecap="round"/><path d="M9 2h1M2 27v1" stroke-linecap="round"/></svg>';



const TRACK_LABELS = {
  science_math: "علمي رياضة",
  science_science: "علمي علوم",
  literary: "أدبي",
};

function renderTrackPicker() {
  const pills = Object.keys(TRACK_LABELS)
    .map((key) => `<button class="track-pill ${state.track === key ? "active" : ""}" data-track="${key}" type="button">${TRACK_LABELS[key]}</button>`)
    .join("");
  return `<div class="track-picker">
    <div class="tp-label">اختر شعبتك لعرض توقع تنسيق مخصص:</div>
    <div class="track-pills">${pills}</div>
  </div>`;
}

function renderCollegeBlock(pct) {
  const table = COLLEGE_TABLES[state.track];
  const picker = renderTrackPicker();
  if (!table) {
    return `<div class="section-title"><span class="dot"></span>توقع التنسيق</div>
      ${picker}
      <div class="disclaimer">اختر الشعبة من فوق لعرض توقع تنسيق تقريبي مناسب لمجموعك.</div>`;
  }
  const sorted = [...table].sort((a, b) => b.min - a.min);
  const eligible = sorted.filter((c) => pct >= c.min);
  const next = [...sorted].reverse().find((c) => pct < c.min);

  let rows;
  if (eligible.length) {
    rows = eligible
      .map((c, i) => `<div class="college-row ${i === 0 ? "top" : ""}">
        <div class="cn">${i === 0 ? '<span class="badge-top">الأعلى تقديرًا</span>' : ""}${escapeHtml(c.name)}</div>
        <div class="cp num">≈ ${c.min}%</div>
      </div>`)
      .join("");
  } else {
    rows = `<div class="empty-note">النسبة الحالية أقل من الحدود التقريبية المتاحة في هذا الجدول لهذه الشعبة.</div>`;
  }

  const nextNote = next
    ? `<div class="next-college">أقرب كلية أعلى من مجموعك تقريبًا: <b>${escapeHtml(next.name)}</b> (تحتاج تقريبًا ${(next.min - pct).toFixed(1)} نقطة نسبة إضافية)</div>`
    : "";

  return `
    <div class="section-title"><span class="dot"></span>توقع التنسيق (استرشادي)</div>
    ${picker}
    <div class="disclaimer">هذه الأرقام تقديرية وتقريبية بناءً على مؤشرات عامة من سنوات سابقة، وليست تنسيقًا رسميًا. التنسيق الفعلي يُحدَّد سنويًا من مكتب تنسيق القبول بالجامعات ويختلف حسب الأماكن المتاحة.</div>
    <div class="college-list">${rows}</div>
    ${nextNote}
  `;
}

/* ---------------------------------------------------------------
   11) أوائل الجمهورية
--------------------------------------------------------------- */
function renderTopList() {
  const g1 = state.groups[1];
  if (!g1) { els.topList.innerHTML = `<div class="empty-note">لا توجد بيانات كافية</div>`; return; }
  // نلقط أعلى 20 فهرس عن طريق ترتيب مؤشرات الناجحين بالنظام العام
  const idxs = [];
  for (let i = 0; i < state.n; i++) {
    if (state.statusCode[i] === 0 && state.cflag[i] === 1) idxs.push(i);
  }
  idxs.sort((a, b) => state.scores[b] - state.scores[a]);
  const top = idxs.slice(0, 20);
  els.topList.innerHTML = top
    .map((i, rank) => `
      <div class="top-row">
        <div class="top-rank ${rank === 0 ? "g1" : ""}">${rank + 1}</div>
        <div class="tn">${escapeHtml(state.names[i])} <span style="color:var(--ink-soft);font-weight:400;font-size:.78rem;">(جلوس <span class="num">${state.seats[i]}</span>)</span></div>
        <div class="ts num">${state.scores[i].toFixed(1)}</div>
      </div>`)
    .join("");
}
