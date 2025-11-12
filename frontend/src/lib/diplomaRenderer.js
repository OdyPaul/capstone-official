// src/lib/diplomaRenderer.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ---------------------------- helpers ---------------------------- */
const toLongDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const PROGRAM_MAP = {
  IT:         { long: "Bachelor of Science in Information Technology", short: "BSIT", level: "bachelor" },
  BTLE:       { long: "Bachelor of Technology and Livelihood Education", short: "BTLEd", level: "bachelor" },
  CIVILENG:   { long: "Bachelor of Science in Civil Engineering", short: "BSCE", level: "bachelor" },
  COMPENG:    { long: "Bachelor of Science in Computer Engineering", short: "BSCpE", level: "bachelor" },
  GEODEENG:   { long: "Bachelor of Science in Geodetic Engineering", short: "BSGE", level: "bachelor" },
  DVM:        { long: "Doctor of Veterinary Medicine", short: "DVM", level: "doctorate" },
};

const humanize = (s="") =>
  String(s)
    .replace(/[_-]+/g, " ")
    .replace(/[A-Z]{2,}(?=[A-Z][a-z])/g, (m) => m + " ")
    .replace(/[A-Z][a-z]+|[0-9]+|[A-Z]+/g, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/\s+/g, " ")
    .trim();

function expandProgram(codeOrName) {
  const raw = String(codeOrName || "").trim();
  const u = raw.toUpperCase();
  if (PROGRAM_MAP[u]) return PROGRAM_MAP[u];
  // if the input already looks like a full degree title, keep it; otherwise default to "Bachelor's Degree in <Name>"
  if (/bachelor|doctor|master/i.test(raw)) return { long: raw, short: raw, level: "other" };
  return { long: `Bachelor's Degree in ${humanize(raw)}`, short: raw, level: "bachelor" };
}

async function fetchAsDataUrl(url) {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    const blob = await res.blob();
    const fr = new FileReader();
    return await new Promise((resolve) => {
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* --------------------------- main render -------------------------- */
/**
 * Renders a single-page landscape A4 Diploma into `mount`.
 *
 * payload minimally requires:
 *   - fullName: "Firstname M. Lastname"
 *   - program:  "IT" | "BTLE" | "CIVILENG" | "COMPENG" | "DVM" | "GEODEENG" | <string>
 *
 * Optional payload fields:
 *   - university: "Your University Name"
 *   - campus:     "Main Campus"
 *   - dateConferred: "2025-03-21" (ISO/any parseable)
 *   - registrarName, presidentName
 */
export async function renderDiplomaFromPayload({
  mount,
  payload,
  bg = "/assets/diploma-bg.png",   // keep under public/assets/
  seal = "/assets/seal.png",        // optional circular seal
} = {}) {
  if (!mount) return 0;

  const p = payload || {};
  const fullName = String(p.fullName || "").trim();
  const programInfo = expandProgram(p.program);
  const university = p.university || "Pampanga State Agricultural University";
  const campus = p.campus || "";
  const dateConferred = toLongDate(p.dateConferred || new Date());
  const registrarName = p.registrarName || "University Registrar";
  const presidentName = p.presidentName || "University President";

  const bgData = bg ? await fetchAsDataUrl(bg) : null;
  const sealData = seal ? await fetchAsDataUrl(seal) : null;

  const html = `
<style>
  @page { size: A4 landscape; margin: 10mm; }
  .dip-root { font-family: "Times New Roman", Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative;
    width: 277mm;   /* 297 - 20  (landscape inside margins) */
    height: 190mm;  /* 210 - 20 */
    page-break-after: always;
    background-repeat:no-repeat; background-position: center center; background-size: cover;
    box-sizing: border-box;
    padding: 18mm 22mm;
  }
  .frame {
    position: absolute; inset: 12mm;
    border: 2px solid #5a4b2e; border-radius: 6mm;
    box-shadow: inset 0 0 0 3mm rgba(218,200,160,0.25);
  }
  .header { text-align: center; letter-spacing: .5px; }
  .univ { font-size: 24pt; font-weight: 700; text-transform: uppercase; }
  .campus { font-size: 11pt; opacity: .85; margin-top: 2mm; }
  .title { font-size: 13pt; margin-top: 10mm; letter-spacing: 1px; }

  .name { text-align:center; margin-top: 6mm; font-size: 30pt; font-weight: 700; text-transform: uppercase; }
  .line { text-align:center; font-size: 13pt; margin-top: 6mm; }
  .degree { text-align:center; font-size: 18pt; font-weight: 700; margin-top: 3mm; }
  .date { text-align:center; font-size: 12pt; margin-top: 10mm; }

  .seal {
    position: absolute; left: 50%; top: 53%;
    transform: translate(-50%, -50%);
    width: 40mm; height: 40mm; opacity: .18;
    background-repeat:no-repeat; background-position:center; background-size:contain;
    pointer-events:none;
  }

  .sign-row {
    position: absolute; left: 22mm; right: 22mm; bottom: 20mm;
    display: grid; grid-template-columns: 1fr 1fr; gap: 28mm;
  }
  .sig { text-align:center; }
  .sig .line { border-top: 1px solid #333; height: 0; margin: 0 0 2mm; }
  .sig .name { font-weight: 600; font-size: 11pt; margin: 0; }
  .sig .role { font-size: 10pt; opacity: .9; margin: 0; }
</style>

<div class="dip-root">
  <div class="page" style="${bgData ? `background-image:url('${bgData}')` : `background-image:linear-gradient(135deg,#fbfaf5 0%,#f3efe0 100%)`}">
    <div class="frame"></div>

    <div class="header">
      <div class="univ">${escapeHtml(university)}</div>
      ${campus ? `<div class="campus">${escapeHtml(campus)}</div>` : ""}
      <div class="title">This is to certify that</div>
    </div>

    <div class="name">${escapeHtml(fullName || "—")}</div>

    <div class="line">has been conferred the degree of</div>
    <div class="degree">${escapeHtml(programInfo.long)}</div>

    <div class="date">Given this ${escapeHtml(dateConferred)}.</div>

    ${sealData ? `<div class="seal" style="background-image:url('${sealData}')"></div>` : ""}

    <div class="sign-row">
      <div class="sig">
        <div class="line"></div>
        <p class="name">${escapeHtml(registrarName)}</p>
        <p class="role">University Registrar</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p class="name">${escapeHtml(presidentName)}</p>
        <p class="role">University President</p>
      </div>
    </div>
  </div>
</div>
`;

  mount.innerHTML = html;
  return 1; // single page
}

// simple safe-escape for injected text nodes (used above)
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* --------------------------- export to PDF -------------------------- */
export async function downloadDiplomaPdf(mountEl, filename = "Diploma.pdf") {
  const page = mountEl.querySelector(".page");
  if (!page) throw new Error("No diploma page to export");

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const canvas = await html2canvas(page, { scale: 2, useCORS: true });
  const img = canvas.toDataURL("image/png");
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, "PNG", 0, 0, w, h);
  pdf.save(filename);
}
