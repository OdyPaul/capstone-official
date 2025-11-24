// src/lib/torRenderer.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== utilities ===== */
const toISODate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
const asset = (p) => {
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "/");
  return base + String(p).replace(/^\/+/, "");
};
const parseYearLevel = (s) => {
  if (!s) return 0;
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};
const parseSemester = (s) => {
  const v = String(s || "").toLowerCase();
  if (v.includes("1st")) return 1;
  if (v.includes("2nd")) return 2;
  if (v.includes("mid")) return 3;
  return 9;
};
const academicYearFor = (yearLevelStr, admissionDate) => {
  if (!admissionDate) return "";
  const base = new Date(admissionDate).getFullYear();
  const lvl = parseYearLevel(yearLevelStr) || 1;
  const y1 = base + (lvl - 1);
  const y2 = y1 + 1;
  return `${y1}-${y2}`;
};
const paginateRows = (rows, perFirst = 23, perNext = 31) => {
  const pages = [];
  if (!rows.length) return pages;
  pages.push(rows.slice(0, perFirst));
  for (let i = perFirst; i < rows.length; i += perNext) {
    pages.push(rows.slice(i, i + perNext));
  }
  return pages;
};
const fetchAsDataUrl = async (url) => {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
};
const preloadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });

/* ===== adapt subjects from various shapes ===== */
const pick = (o, keys) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const normOne = (it, fallbackYear = "", fallbackSem = "") => {
  const yearLevel =
    pick(it, ["yearLevel", "YearLevel", "level", "year_level", "year"]) ??
    fallbackYear ?? "";
  const semester =
    pick(it, ["semester", "Semester", "term", "sem"]) ?? fallbackSem ?? "";

  const subjectCode =
    pick(it, [
      "subjectCode",
      "SubjectCode",
      "courseCode",
      "code",
      "subject_code",
      "course_no",
      "courseNumber",
    ]) ||
    pick(it?.subject, ["code", "subjectCode", "course_no", "courseNumber"]) ||
    "";

  // Prefer description; fall back to various "title" keys
  const subjectTitle =
    pick(it, ["subjectTitle", "SubjectTitle", "title", "name", "description"]) ||
    pick(it?.subject, ["subjectTitle", "SubjectTitle", "title", "name", "description"]) ||
    "";

  const subjectDescription =
    pick(it, ["subjectDescription", "description", "name", "title"]) ||
    subjectTitle ||
    "";

  const units = String(
    pick(it, ["units", "Units", "credit", "credits", "creditUnits", "unitsEarned"]) ?? ""
  );
  const finalGrade = String(
    pick(it, ["finalGrade", "FinalGrade", "grade", "final", "mark"]) ?? ""
  );

  return {
    yearLevel,
    semester,
    subjectCode,
    subjectDescription,
    subjectTitle,
    units,
    finalGrade,
    reExam: "",
    ay: "",
  };
};

function flattenObjectOfArrays(obj, keyYear = "", keySem = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (!Array.isArray(v)) continue;
    let y = keyYear, s = keySem;
    if (!y || !s) {
      const parts = String(k).split("|");
      if (!y && parts[0]) y = parts[0].trim();
      if (!s && parts[1]) s = parts[1].trim();
    }
    for (const it of v) out.push(normOne(it, y, s));
  }
  return out;
}

function extractSubjects(p) {
  // common shapes
  if (Array.isArray(p?.data?.subjects)) return p.data.subjects.map((it) => normOne(it));
  if (Array.isArray(p?.subjects)) return p.subjects.map((it) => normOne(it));
  if (Array.isArray(p?.grades)) return p.grades.map((it) => normOne(it));
  if (Array.isArray(p?.data?.grades)) return p.data.grades.map((it) => normOne(it));
  if (Array.isArray(p?.tor?.subjects)) return p.tor.subjects.map((it) => normOne(it));
  if (Array.isArray(p?.tor?.grades)) return p.tor.grades.map((it) => normOne(it));
  if (Array.isArray(p?.transcript?.grades)) return p.transcript.grades.map((it) => normOne(it));

  // stringified
  if (typeof p?.subjects === "string") {
    try {
      const parsed = JSON.parse(p.subjects);
      if (Array.isArray(parsed)) return parsed.map((it) => normOne(it));
      if (parsed && typeof parsed === "object") return flattenObjectOfArrays(parsed);
    } catch {}
  }

  // object-of-arrays, array-like objects
  if (p?.subjects && typeof p.subjects === "object") {
    if (typeof p.subjects.length === "number" && p.subjects.length > 0) {
      try { return Array.from(p.subjects).map((it) => normOne(it)); } catch {}
    }
    const flat = flattenObjectOfArrays(p.subjects);
    if (flat.length) return flat;
  }

  // conservative fallback
  const candidates = [
    p?.data?.subjects,
    p?.transcript?.subjects,
    p?.records,
    p?.courses,
    p?.components,
  ].filter(Array.isArray);
  if (candidates.length && candidates[0].length) {
    return candidates[0].map((it) => normOne(it));
  }

  // last resort: unwrap nested `data`
  if (p?.data && typeof p.data === "object") {
    const inner = extractSubjects(p.data);
    if (inner.length) return inner;
  }
  return [];
}

/* ===== adapt top/header fields (works with VC or printable shape) ===== */
const adaptHeader = (p = {}) => {
  const cs =
    p.credentialSubject ||
    p.subject ||
    p?.data?.credentialSubject ||
    p?.data?.subject ||
    {};

  return {
    fullName: p.fullName || cs.fullName || cs.name || p.name || "",
    studentNumber: p.studentNumber || cs.studentNumber || cs.student_id || cs.id || "",
    address: p.address || cs.address || "",
    entranceCredentials: p.entranceCredentials || cs.entranceCredentials || "",
    highSchool: p.highSchool || cs.highSchool || "",
    program: p.program || cs.program || cs.course || "",
    major: p.major || cs.major || "",
    placeOfBirth: p.placeOfBirth || cs.placeOfBirth || cs.birthPlace || "",
    dateAdmission: p.dateAdmission || cs.dateAdmission || cs.admissionDate || "",
    dateGraduated: p.dateGraduated || cs.dateGraduated || cs.graduationDate || "",
    dateOfBirth: p.dateOfBirth || cs.dateOfBirth || cs.birthDate || "",
    gwa: p.gwa || cs.gwa || cs.GWA || "",
  };
};

/* ===== build & sort rows ===== */
const buildRows = (rawSubjects = [], admissionDate = null) => {
  const norm = (rawSubjects || []).map((s) => {
    const ay = academicYearFor(s.yearLevel, admissionDate);
    const sem = s.semester || "";
    return {
      yearLevel: s.yearLevel,
      semester: sem,
      subjectCode: s.subjectCode || "",
      subjectDescription: s.subjectDescription || s.subjectTitle || s.title || s.name || "",
      finalGrade: (s.finalGrade ?? "").toString(),
      reExam: s.reExam || "",
      units: (s.units ?? "").toString(),
      ay,
      termKey: `${parseYearLevel(s.yearLevel) || 0}|${parseSemester(sem)}`,
      _termLabelHtml: `<div>${sem}</div><div class="ay">${ay || ""}</div>`,
    };
  });

  norm.sort((a, b) => {
    const ya = parseYearLevel(a.yearLevel), yb = parseYearLevel(b.yearLevel);
    if (ya !== yb) return ya - yb;
    const sa = parseSemester(a.semester), sb = parseSemester(b.semester);
    if (sa !== sb) return sa - sb;
    return (a.subjectCode || "").localeCompare(b.subjectCode || "");
  });
  return norm;
};

/* ===== render pages ===== */
export async function renderTorFromPayload({
  mount,
  payload,
  // 👇 use your new template images by default
  bg1 = "/assets/first-page.png",
  bg2 = "/assets/continue-page.png",
  rowsPerFirst = 23,
  rowsPerNext = 31,
}) {
  if (!mount) return 0;

  const header = adaptHeader(payload || {});
  const adapted = extractSubjects(payload || {});
  const rows = buildRows(adapted, header.dateAdmission || null);

  // paginate or keep one empty page
  const chunks = rows.length ? paginateRows(rows, rowsPerFirst, rowsPerNext) : [[]];

  // show TERM only on the first row of each term *per page*
  const pages = chunks.map((chunk, idx) => {
    let prevKey = null;
    const rowsWithTerm = chunk.map((r) => {
      const termHtml = r.termKey !== prevKey ? r._termLabelHtml : "";
      prevKey = r.termKey;
      return { ...r, termHtml };
    });
    return { isFirst: idx === 0, rows: rowsWithTerm };
  });

  // backgrounds
  const [bg1Data, bg2Data] = await Promise.all([
    fetchAsDataUrl(asset(bg1)),
    fetchAsDataUrl(asset(bg2)),
  ]);
  await Promise.all([preloadImage(bg1Data), preloadImage(bg2Data)]);

  const html = `
<style>
  @page { size: A4; margin: 10mm; }
  html, body { height: 100%; }
  .tor-root{ font-family: Arial, sans-serif; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative; width: 190mm; height: 277mm; page-break-after: always; box-sizing: border-box;
    background-repeat: no-repeat; background-position: 0 0; background-size: 190mm 277mm;
    --left: 10mm; --right: 10mm;
    --rows-top-first: 92mm; --rows-top-next: 72mm;
    /* field anchors roughly matched to template lines */
    --name-x: 35mm; --name-y: 47mm; --admit-x:150mm; --admit-y:47mm;
    --addr-x: 35mm; --addr-y: 54mm; --pob-x: 150mm; --pob-y: 54mm;
    --entr-x: 35mm; --entr-y: 61mm; --dob-x:150mm; --dob-y:61mm;
    --hs-x: 35mm; --hs-y: 68mm; --dgrad-x:150mm; --dgrad-y:68mm;
    --prog-x: 35mm; --prog-y: 75mm; --major-x:150mm; --major-y:75mm;
    --grad-x: 150mm; --grad-y: 82mm; --issued-x:35mm; --issued-y:82mm;
  }
  .field { position: absolute; white-space: nowrap; line-height: 1.1; }
  .page.first .name     { left: var(--name-x);   top: var(--name-y); }
  .page.first .admit    { left: var(--admit-x);  top: var(--admit-y); }
  .page.first .address  { left: var(--addr-x);   top: var(--addr-y); max-width: 110mm; overflow: hidden; text-overflow: ellipsis; }
  .page.first .pob      { left: var(--pob-x);    top: var(--pob-y); }
  .page.first .entr     { left: var(--entr-x);   top: var(--entr-y); }
  .page.first .dob      { left: var(--dob-x);    top: var(--dob-y); }
  .page.first .hs       { left: var(--hs-x);     top: var(--hs-y); }
  .page.first .dategrad { left: var(--dgrad-x);  top: var(--dgrad-y); }
  .page.first .program  { left: var(--prog-x);   top: var(--prog-y); }
  .page.first .major    { left: var(--major-x);  top: var(--major-y); }
  .page.first .grad     { left: var(--grad-x);   top: var(--grad-y); }
  .page.first .issued   { left: var(--issued-x); top: var(--issued-y); }
  .page.other .name     { left: var(--name-x);   top: 47mm; }

  .grid { position: absolute; left: var(--left); right: var(--right); border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  .page.first .grid { top: var(--rows-top-first); } .page.other .grid { top: var(--rows-top-next); }
  .grid col.col-term   { width: 32mm; }
  .grid col.col-code   { width: 26mm; }
  .grid col.col-subj   { width: auto; }
  .grid col.col-grade  { width: 18mm; }
  .grid col.col-reexam { width: 18mm; }
  .grid col.col-units  { width: 16mm; }
  thead th {
    font-weight: 700; text-align: center; vertical-align: middle;
    height: 6mm; line-height: 6mm; padding: 0 2mm;
    border-top: 1px solid #000; border-bottom: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000;
    white-space: nowrap; background:#fff;
  }
  tbody td {
    padding: 0 2mm; height: 6mm; line-height: 6mm; vertical-align: middle; overflow: hidden;
    border-top: none; border-bottom: none; border-left: 1px solid #000; border-right: 1px solid #000; background:#fff;
  }
  tbody td:first-child { border-left: none; } tbody td:last-child { border-right: none; }
  .td-code { white-space: nowrap; }
  .td-subj { white-space: normal; }
  .td-subj .twolines { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; line-height: 3mm; height: 6mm; }
  .td-grade, .td-reexam, .td-units { text-align: center; }
  .term-wrap { display: inline-block; line-height: 1.0; } .term-wrap .ay { font-size: 10px; display: block; margin-top: -1px; }
  tr { page-break-inside: avoid; }
</style>
<div class="tor-root">
  ${pages
    .map((pg, idx) => {
      const bg = idx === 0 ? bg1Data : bg2Data;
      const first = pg.isFirst;
      const absFields = first
        ? `
          <div class="field name">${header.fullName || ""}</div>
          <div class="field admit">${toISODate(header.dateAdmission || "")}</div>
          <div class="field address">${header.address || ""}</div>
          <div class="field pob">${header.placeOfBirth || ""}</div>
          <div class="field entr">${header.entranceCredentials || ""}</div>
          <div class="field dob">${toISODate(header.dateOfBirth || "")}</div>
          <div class="field hs">${header.highSchool || ""}</div>
          <div class="field dategrad">${toISODate(header.dateGraduated || "")}</div>
          <div class="field program">${header.program || ""}</div>
          <div class="field major">${header.major || ""}</div>
          <div class="field grad">${toISODate(header.dateGraduated || "")}</div>
          <div class="field issued">${toISODate(new Date())}</div>
        `
        : `<div class="field name">${header.fullName || ""}</div>`;
      return `
      <div class="page ${first ? "first" : "other"}" style="background-image:url('${bg}');">
        ${absFields}
        <table class="grid">
          <colgroup>
            <col class="col-term" /><col class="col-code" /><col class="col-subj" /><col class="col-grade" /><col class="col-reexam" /><col class="col-units" />
          </colgroup>
          <thead>
            <tr>
              <th>TERM</th><th>COURSE NO.</th><th>SUBJECTS / DESCRIPTION</th><th>FINAL GRADE</th><th>RE-EXAM</th><th>CREDIT</th>
            </tr>
          </thead>
          <tbody>
            ${pg.rows
              .map(
                (r) => `
                <tr>
                  <td class="td-term">${r.termHtml ? `<span class="term-wrap">${r.termHtml}</span>` : ""}</td>
                  <td class="td-code">${r.subjectCode}</td>
                  <td class="td-subj"><span class="twolines">${r.subjectDescription}</span></td>
                  <td class="td-grade">${r.finalGrade}</td>
                  <td class="td-reexam">${r.reExam || ""}</td>
                  <td class="td-units">${r.units}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
    })
    .join("")}
</div>`;
  mount.innerHTML = html;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return mount.querySelectorAll(".page").length || 0;
}

/* ===== export PDF ===== */
export async function downloadTorPdf(mountEl, filename = "TOR.pdf") {
  const pages = Array.from(mountEl?.querySelectorAll(".page") || []);
  if (!pages.length) throw new Error("No pages to export");

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  let first = true;
  for (const page of pages) {
    const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(img, "PNG", 0, 0, w, h);
  }
  pdf.save(filename);
}
