// src/pages/web/verification/VerificationPortal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_URL as CONFIG_API_URL } from "../../config";
import { renderTorFromPayload, downloadTorPdf } from "../lib/torRenderer";
import { renderDiplomaFromPayload, downloadDiplomaPdf } from "../lib/diplomaRenderer";

// ✅ Import assets so bundler gives proper URLs in dev & build
import torBg1 from "../assets/public/tor-page-1.png";
import torBg2 from "../assets/public/tor-page-2.png";
// ⬇️ logo (same image as in IssuerProfile)
import psauLogo from "../assets/psau_logo.png";

/** Resolve API base (origin only; no trailing slash; no `/api`) */
const stripBase = (u = "") => String(u).trim().replace(/\/+$/, "").replace(/\/api$/, "");
const RUNTIME_ENV_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL)) ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "";
const API_BASE = stripBase(CONFIG_API_URL || RUNTIME_ENV_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================== Stepper ============================== */
function Stepper({ step, steps, onDark = false }) {
  const pct = ((Math.max(1, Math.min(steps.length, step)) - 1) / (steps.length - 1 || 1)) * 100;
  return (
    <div className={`stepper position-relative py-3 ${onDark ? "stepper-on-dark" : ""}`}>
      <div className="position-absolute start-0 end-0" style={{ top: 18 }}>
        <div className="progress stepper-progress" style={{ height: 4 }}>
          <div className={`progress-bar ${onDark ? "" : "bg-success"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="d-flex justify-content-between position-relative">
        {steps.map((s, i) => {
          const id = i + 1;
          const state = step > id ? "done" : step === id ? "current" : "todo";
          const isCurrent = state === "current";
          const circleTone =
            state === "done"
              ? "bg-success text-white"
              : isCurrent
              ? "bg-success text-white border border-3 border-success-subtle shadow"
              : "bg-secondary bg-opacity-25 text-secondary";
          const labelTone = state === "todo" ? "text-secondary" : "text-dark";
          return (
            <div key={id} className="text-center" style={{ minWidth: 96 }}>
              <div
                className={`circle ${state} rounded-circle d-inline-flex align-items-center justify-content-center fw-bold ${circleTone}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {id}
              </div>
              <div className={`small mt-2 label ${state} ${labelTone}`}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Progress ============================== */
function Progress({ value }) {
  return (
    <div className="progress" style={{ height: 8 }}>
      <div
        className="progress-bar bg-success"
        role="progressbar"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  );
}

/* ============================== Explorer helpers ============================== */
const EXPLORERS = {
  80002: { label: "Polygon Amoy", tx: (h) => `https://amoy.polygonscan.com/tx/${h}` },
  137: { label: "Polygon", tx: (h) => `https://polygonscan.com/tx/${h}` },
};
const txUrl = (chainId, hash) => EXPLORERS[Number(chainId)]?.tx(hash) || null;

const mono = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

function titleize(s = "") {
  return s
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Normalize meta (for the header info box only) */
function normalizeMeta(res) {
  const m = res?.meta || {};
  const vcType = m.vc_type || res?.vc_type || m.type || res?.type || "VC";
  const holder = m.holder_name || m.holder || res?.holder_name || res?.holder || null;

  const anch0 = m.anchoring || res?.anchoring || {};
  const anch = {
    chain_id: anch0.chain_id ?? anch0.chainId ?? null,
    tx_hash: anch0.tx_hash ?? anch0.txHash ?? null,
    merkle_root: anch0.merkle_root ?? anch0.merkleRoot ?? null,
  };

  return { vcType, holder, anch, print_url: m.print_url || null };
}

/* ===== Kind detection: Diploma VC vs TOR ===== */
function detectPrintableKind(meta, printable) {
  const slug =
    meta?.template?.slug ||
    meta?.template_slug ||
    meta?.templateSlug ||
    meta?.template?.name ||
    meta?.name ||
    "";

  const looksDiplomaBySlug = String(slug).toLowerCase().includes("diploma");

  const hasSubjectsArray = Array.isArray(printable?.subjects) && printable.subjects.length > 0;
  const hasSubjectsObject =
    printable?.subjects && typeof printable.subjects === "object" && !Array.isArray(printable.subjects);

  const hasProgram = !!printable?.program;
  const hasFullName = !!printable?.fullName;

  if (looksDiplomaBySlug) return "diploma";
  if (hasProgram && hasFullName && !hasSubjectsArray && !hasSubjectsObject) return "diploma";
  if (hasSubjectsArray || hasSubjectsObject) return "tor";
  return "tor";
}

/* ======================= Image preloader (robust) ======================= */
function loadImageSafe(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/* ============================== Page ============================== */
export default function VerificationPortal() {
  // Accept any route param name (sessionId / session / id / first param)
  const params = useParams();
  const sessionId = params.sessionId || params.session || params.id || Object.values(params)[0] || "";

  // No visible preview; we render off-screen when downloading
  const hiddenRenderRef = useRef(null);

  const location = useLocation();
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const hasHintInLink = qs.has("hint");
  const hasCidInLink = qs.has("credential_id");
  const hasFastPath = !!sessionId || hasHintInLink || hasCidInLink;

  // Read issuer env (like IssuerProfile)
  const ISSUER_NAME =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ISSUER_NAME) || "";
  const ISSUER_DID =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ISSUER_DID) || "";
  const ANCHOR_ADDR =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_MERKLE_ANCHOR_ADDRESS) ||
    "";

  const prettyIssuerName = useMemo(() => titleize(ISSUER_NAME), [ISSUER_NAME]);

  const stepsList = hasFastPath
    ? [
        { label: "Fill up" },
        { label: "Request permission" },
        { label: "Result" },
      ]
    : [
        { label: "Provide credential" },
        { label: "Fill up" },
        { label: "Request permission" },
        { label: "Result" },
      ];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", org: "", purpose: "Credential verification" });
  const formReady = form.name.trim() && form.org.trim();

  const [pastedLink, setPastedLink] = useState("");
  const [qrError, setQrError] = useState("");
  const [hasDetectedCid, setHasDetectedCid] = useState(false);

  /* ----- Phases & loaders ----- */
  const [resultPhase, setResultPhase] = useState("idle");
  const [requesting, setRequesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);

  const pollingRef = useRef(false);
  const tickerRef = useRef(null);
  const validateTimerRef = useRef(null);

  const VALIDATE_DURATION_MS = 5000;
  const STAGE_MESSAGES = [
    "Validating VC (signature & digest)…",
    "Checking Merkle proof…",
    "Confirming anchoring on Polygon…",
  ];
  const STAGE_INTERVAL_MS = Math.max(1000, Math.floor(VALIDATE_DURATION_MS / STAGE_MESSAGES.length));

  useEffect(() => {
    return () => {
      clearInterval(tickerRef.current);
      clearTimeout(validateTimerRef.current);
    };
  }, []);

  const sessionDeepLink =
    (typeof window !== "undefined" ? window.location.origin : "") + `/verify/${sessionId}?from=mobile`;

  function startValidationTicker() {
    clearInterval(tickerRef.current);
    setStageIndex(0);
    setProgress(15);
    tickerRef.current = setInterval(() => {
      setStageIndex((i) => {
        const next = Math.min(i + 1, STAGE_MESSAGES.length - 1);
        const pct = Math.round(((next + 1) / STAGE_MESSAGES.length) * 95);
        setProgress((p) => (p < pct ? pct : p));
        return next;
      });
    }, STAGE_INTERVAL_MS);
  }
  function stopValidationTicker() {
    clearInterval(tickerRef.current);
  }

  async function postJSON(path, body) {
    const r = await fetch(`${API_BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        msg = (await r.json()).message || msg;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async function pollUntilResult({ pollMs = 1200, timeoutMs = 120000 } = {}) {
    pollingRef.current = true;
    const start = Date.now();

    while (pollingRef.current) {
      const r = await fetch(`${API_BASE}/api/verification/session/${sessionId}`, { cache: "no-store" });
      const data = await r.json().catch(() => ({}));
      const res = data?.result;
      const reason = res?.reason;

      if (reason && reason !== "pending") {
        setResult(res || { valid: false, reason: "unknown" });
        setResultPhase("validating");
        startValidationTicker();
        clearTimeout(validateTimerRef.current);
        validateTimerRef.current = setTimeout(() => {
          stopValidationTicker();
          setProgress(100);
          setResultPhase("done");
        }, VALIDATE_DURATION_MS);
        pollingRef.current = false;
        return;
      }

      if (Date.now() - start > timeoutMs) {
        setResult({ valid: false, reason: "timeout_waiting_for_holder" });
        setResultPhase("validating");
        startValidationTicker();
        clearTimeout(validateTimerRef.current);
        validateTimerRef.current = setTimeout(() => {
          stopValidationTicker();
          setProgress(100);
          setResultPhase("done");
        }, VALIDATE_DURATION_MS);
        pollingRef.current = false;
        return;
      }

      await sleep(pollMs);
    }
  }

  /* ---------- step 1 helpers (no fast path) ---------- */
  async function decodeQrFileClient(file) {
    setQrError("");
    if (!file) {
      setQrError("Please choose a QR image first.");
      return;
    }
    if (!/image\/(png|jpe?g|webp)/i.test(file.type)) {
      setQrError("Unsupported file type. Use PNG, JPG or WEBP.");
      return;
    }
    if (file.size > 1_500_000) {
      setQrError("Image is too large. Max 1.5 MB.");
      return;
    }

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const url = URL.createObjectURL(file);
      try {
        const res = await reader.decodeFromImageUrl(url);
        const text = res?.getText?.() || "";
        if (!text) throw new Error("QR not recognized");

        let detected = false;
        try {
          const o = JSON.parse(text);
          if (o && o.credential_id) detected = true;
        } catch {
          try {
            const u = new URL(text);
            if (u.searchParams.get("credential_id")) detected = true;
          } catch {}
        }
        if (!detected) throw new Error("QR missing credential info");
        setHasDetectedCid(true);
      } finally {
        URL.revokeObjectURL(url);
        reader.reset();
      }
    } catch (e) {
      setQrError(e?.message || "Failed to decode QR");
    }
  }

  function tryExtractCidFromLink(link) {
    setPastedLink(link);
    try {
      const u = new URL(link);
      if (u.searchParams.get("credential_id")) setHasDetectedCid(true);
    } catch {}
  }

  async function requestPermission() {
    if (!formReady || requesting) return;

    try {
      setRequesting(true);
      await postJSON(`/verification/session/${sessionId}/begin`, {
        org: form.org.trim(),
        contact: form.name.trim(),
        purpose: form.purpose.trim() || "Credential verification",
      });
    } catch (err) {
      setRequesting(false);
      alert(err.message || "Failed to request permission");
      return;
    }

    setRequesting(false);
    setResult(null);
    setProgress(10);
    setResultPhase("waiting");
    setStep(hasFastPath ? 3 : 4);
    pollUntilResult();
  }

  /* ---------- DEBUG: log meta + printable when verification succeeds ---------- */
  useEffect(() => {
    if (resultPhase !== "done" || !result?.valid) return;
    const meta = result?.meta || {};
    const printable = meta?.printable;
    const tmpl = meta?.template || {};
    console.groupCollapsed("%c[Verify] meta + printable", "color:#0b7;font-weight:bold");
    console.log("meta:", meta);
    console.log("template slug/name:", tmpl?.slug, tmpl?.name);
    console.log("vc_type:", meta?.vc_type, "holder:", meta?.holder || meta?.holder_name);
    console.log(
      "printable keys:",
      printable ? Object.keys(printable) : null
    );
    console.log(
      "subjects:",
      printable?.subjects &&
        (Array.isArray(printable.subjects)
          ? `array(${printable.subjects.length})`
          : typeof printable.subjects)
    );
    console.log("program:", printable?.program, "fullName:", printable?.fullName);
    console.log("detected kind:", detectPrintableKind(meta, printable));
    console.groupEnd();
  }, [resultPhase, result]);

  /* ---------- Off-screen renders ---------- */
  function makeHiddenMount() {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      left: "-10000px",
      top: "-10000px",
      width: "210mm",
      minHeight: "297mm",
      pointerEvents: "none",
      opacity: "0",
      zIndex: "-1",
    });
    document.body.appendChild(el);
    return el;
  }

  async function renderAndDownloadTor(printable) {
    const mount = makeHiddenMount();
    try {
      // ✅ Preload backgrounds; if a load fails, we silently omit that bg (still printable)
      let bg1Url = null,
        bg2Url = null;
      try {
        bg1Url = await loadImageSafe(torBg1);
      } catch {}
      try {
        bg2Url = await loadImageSafe(torBg2);
      } catch {}

      await renderTorFromPayload({
        mount,
        payload: printable,
        ...(bg1Url ? { bg1: bg1Url } : {}),
        ...(bg2Url ? { bg2: bg2Url } : {}),
        rowsPerFirst: 23,
        rowsPerNext: 31,
      });

      const pageCount = mount.querySelectorAll(".page").length;
      if (!pageCount) {
        throw new Error("No subjects found in the credential (cannot build TOR).");
      }

      await downloadTorPdf(mount, `TOR_${printable?.studentNumber || "student"}.pdf`);
    } finally {
      mount.remove();
    }
  }

  async function renderAndDownloadDiploma(printable) {
    const mount = makeHiddenMount();
    try {
      await renderDiplomaFromPayload({
        mount,
        payload: printable,
      });
      await downloadDiplomaPdf(
        mount,
        `Diploma_${(printable?.fullName || "graduate").replace(/\s+/g, "_")}.pdf`
      );
    } finally {
      mount.remove();
    }
  }

  async function handleDownload(printable, meta) {
    if (!printable) return;
    const kind = detectPrintableKind(meta, printable);
    if (kind === "diploma") {
      await renderAndDownloadDiploma(printable);
    } else {
      await renderAndDownloadTor(printable);
    }
  }

  return (
    <main className="bg-success-subtle bg-gradient min-vh-100">
      {/* Header: issuer view when NO session, stepper when session is present */}
      <header className="bg-success text-white">
        <div className="container py-3">
          {hasFastPath ? (
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-white bg-opacity-10 d-inline-flex align-items-center justify-content-center shadow-inner"
                style={{ width: 40, height: 40 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 11h10v8H7z" stroke="#fff" strokeWidth="2" />
                  <path d="M9 11V8a3 3 0 116 0v3" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>
              <h1 className="h5 mb-0 fw-semibold">Verify Credentials</h1>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-3">
              <div className="flex-grow-1">
                <div className="small text-white-50 mb-1">Issuer</div>
                <h1 className="h5 mb-0 fw-semibold">
                  {prettyIssuerName || ISSUER_NAME || "Verification Portal"}
                </h1>
                {(ISSUER_DID || ANCHOR_ADDR) && (
                  <div className="small mt-1">
                    {ISSUER_DID && (
                      <>
                        Blockchain Wallet Address:&nbsp;
                        <span style={mono}>{ISSUER_DID}</span>
                      </>
                    )}
                    {ISSUER_DID && ANCHOR_ADDR && <span className="mx-2">•</span>}
                    {ANCHOR_ADDR && (
                      <>
                        Anchor:&nbsp;
                        <span style={mono}>{ANCHOR_ADDR}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {hasFastPath && (
            <div className="mt-3">
              <Stepper step={step} steps={stepsList} onDark />
            </div>
          )}
        </div>
      </header>

      {/* Card */}
      <section className="container">
        <div className="card shadow-sm mt-n4">
          <div className="card-body p-4 p-md-5">
            {/* === NO SESSION: Step 1 → Provide credential (welcome + paste/upload) === */}
            {!hasFastPath && step === 1 && (
              <>
                <h2 className="h3 fw-bold text-dark d-flex align-items-center gap-2">
                  <img
                    src={psauLogo}
                    alt="PSAU logo"
                    style={{ width: 40, height: 40, objectFit: "contain" }}
                  />
                  <span>
                    Welcome to the {prettyIssuerName || ISSUER_NAME || "PSAU"} Verification Portal
                  </span>
                </h2>
                <p className="text-muted mb-4">
                  To start, paste the verification request link or upload the QR code from the holder.
                </p>

                <div className="row g-4 mt-2">
                  <div className="col-lg-7">
                    <div className="border rounded-3 p-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge text-bg-secondary">Option A</span>
                        <strong>Paste verification request</strong>
                      </div>
                      <input
                        className="form-control"
                        placeholder="Paste link with ?credential_id=..."
                        value={pastedLink}
                        onChange={(e) => tryExtractCidFromLink(e.target.value)}
                      />
                      <div className="form-text">
                        We’ll only check that it contains a credential identifier.
                      </div>

                      <hr />

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge text-bg-secondary">Option B</span>
                        <strong>Upload QR image</strong>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="form-control"
                        onChange={(e) => {
                          setQrError("");
                          const f = e.target.files?.[0] || null;
                          if (f) decodeQrFileClient(f);
                        }}
                      />
                      <div className="form-text">PNG, JPG, WEBP (max 1.5&nbsp;MB)</div>

                      {qrError && (
                        <div className="alert alert-warning py-2 mt-2 mb-0">
                          <small>{qrError}</small>
                        </div>
                      )}

                      <div className="mt-3 p-2 rounded bg-light border">
                        <div className="small text-muted">Detected credential:</div>
                        <code className="small">{hasDetectedCid ? "present" : "—"}</code>
                      </div>

                      <div className="mt-3 d-flex gap-2">
                        {/* No numbered steps here, so no "Back" button on first screen */}
                        <button
                          className="btn btn-success fw-semibold"
                          disabled={!hasDetectedCid}
                          onClick={() => setStep(2)}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right column (for holder QR) only makes sense if there is a sessionId */}
                  {sessionId && (
                    <div className="col-lg-5">
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="badge text-bg-success">For holder</span>
                          <strong>Scan this session on phone</strong>
                        </div>
                        <div className="d-flex align-items-center justify-content-center bg-white rounded-3 p-2">
                          <img
                            src={`${API_BASE}/api/verification/session/${sessionId}/qr.png?size=220`}
                            alt="Session QR"
                            width={220}
                            height={220}
                            className="img-fluid"
                          />
                        </div>
                        <div className="form-text mt-3">Or share this link:</div>
                        <div className="input-group">
                          <input
                            className="form-control"
                            readOnly
                            value={sessionDeepLink}
                            onFocus={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-success"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(sessionDeepLink);
                              } catch {}
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* === Fill up details: step 1 (fast path) or step 2 (no session) === */}
            {(hasFastPath ? step === 1 : step === 2) && (
              <>
                <h2 className="h3 fw-bold text-dark">Fill up your details</h2>
                <p className="text-muted mb-4">
                  We will ask the holder’s permission before any verification.
                </p>

                <form
                  className="row g-3 align-items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formReady) setStep(hasFastPath ? 2 : 3);
                  }}
                >
                  <div className="col-md-3">
                    <label className="col-form-label">Your Name</label>
                  </div>
                  <div className="col-md-9">
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Alex Rivera"
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="col-form-label">Organization</label>
                  </div>
                  <div className="col-md-9">
                    <input
                      className="form-control"
                      value={form.org}
                      onChange={(e) => setForm({ ...form, org: e.target.value })}
                      placeholder="e.g., Greenleaf Inc."
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="col-form-label">Purpose</label>
                  </div>
                  <div className="col-md-9">
                    <input
                      className="form-control"
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      placeholder="e.g., Hiring, Enrollment, Compliance"
                    />
                  </div>

                  <div className="col-12 pt-2 d-flex gap-2">
                    {!hasFastPath && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!formReady}
                      className="btn btn-success fw-semibold"
                    >
                      Next
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* === Request permission: step 2 (fast path) / step 3 (no session) === */}
            {(hasFastPath ? step === 2 : step === 3) && (
              <>
                <h2 className="h3 fw-bold text-dark">Request permission</h2>
                <p className="text-muted">
                  We’ll ask the holder to approve sending their credential.
                </p>

                <div className="border rounded-3 p-3">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <div className="small text-muted">Your Name</div>
                      <div className="fw-semibold">{form.name}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="small text-muted">Organization</div>
                      <div className="fw-semibold">{form.org}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="small text-muted mt-2">Purpose</div>
                      <div className="fw-semibold">
                        {form.purpose || "Credential verification"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setStep(hasFastPath ? 1 : 2)}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-success fw-semibold"
                      disabled={!formReady || requesting}
                      onClick={requestPermission}
                    >
                      {requesting ? "Requesting…" : "Request permission"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* === Result: step 3 (fast path) / step 4 (no session) === */}
            {(hasFastPath ? step === 3 : step === 4) && (
              <>
                <h2 className="h3 fw-bold text-dark">Result</h2>

                {resultPhase === "waiting" && (
                  <div className="mt-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="spinner-border spinner-border-sm text-success" role="status" />
                      <span className="text-dark">Requesting VC from user…</span>
                    </div>
                    <Progress value={progress} />
                    <div className="small text-muted mt-2">
                      Waiting for the holder to approve the request.
                    </div>
                  </div>
                )}

                {resultPhase === "validating" && (
                  <div className="mt-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="spinner-border spinner-border-sm text-success" role="status" />
                      <span className="text-dark">{STAGE_MESSAGES[stageIndex]}</span>
                    </div>
                    <Progress value={progress} />
                    <div className="small text-muted mt-2">
                      Verifying signature, Merkle proof, and anchoring…
                    </div>
                  </div>
                )}

                {resultPhase === "done" && (
                  <>
                    {result?.valid ? (
                      <>
                        <div className="alert alert-success mt-3">
                          <div className="fw-semibold mb-1">Credential is valid.</div>
                          <div className="small">
                            {result.reason === "not_anchored"
                              ? "Note: Valid, but not anchored yet."
                              : "All checks passed."}
                          </div>
                        </div>

                        {(() => {
                          const meta = normalizeMeta(result);
                          const chainId = meta.anch.chain_id;
                          const chainLabel =
                            EXPLORERS[Number(chainId)]?.label || (chainId ?? "—");
                          const tx = meta.anch.tx_hash;
                          const root = meta.anch.merkle_root;
                          const printable = result?.meta?.printable;

                          const label =
                            detectPrintableKind(result?.meta, printable) === "diploma"
                              ? "Download Diploma PDF"
                              : "Download TOR PDF";

                          return (
                            <>
                              <div className="mt-3 row g-3">
                                <div className="col-md-4">
                                  <div className="small text-muted">VC Type</div>
                                  <div className="fw-semibold">{meta.vcType || "—"}</div>
                                </div>
                                <div className="col-md-4">
                                  <div className="small text-muted">Holder</div>
                                  <div className="fw-semibold">{meta.holder || "—"}</div>
                                </div>
                                <div className="col-md-4">
                                  <div className="small text-muted">Anchor Chain</div>
                                  <div className="fw-semibold">{chainLabel}</div>
                                </div>

                                <div className="col-md-12">
                                  <div className="small text-muted">Merkle Root</div>
                                  <code className="fw-semibold">{root || "—"}</code>
                                </div>

                                <div className="col-md-12">
                                  <div className="small text-muted">Transaction</div>
                                  {tx ? (
                                    <a
                                      href={txUrl(chainId, tx) || "#"}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="fw-semibold text-decoration-underline"
                                    >
                                      {tx}
                                    </a>
                                  ) : (
                                    <div className="fw-semibold">—</div>
                                  )}
                                </div>
                              </div>

                              {/* Download only (no on-screen preview) */}
                              <div className="mt-4 d-flex gap-2">
                                <button
                                  className={`btn fw-semibold ${
                                    printable ? "btn-success" : "btn-outline-secondary disabled"
                                  }`}
                                  onClick={async () => {
                                    if (!printable) return;
                                    try {
                                      await handleDownload(printable, result?.meta);
                                    } catch (err) {
                                      console.error("[Download] failed:", err);
                                      alert(
                                        err?.message ||
                                          "Failed to generate PDF. See console for details."
                                      );
                                    }
                                  }}
                                  title={
                                    printable
                                      ? "Generate and download PDF"
                                      : "Printable payload missing"
                                  }
                                >
                                  {label}
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="alert alert-danger mt-3 mb-0">
                        <div className="fw-semibold">Verification failed.</div>
                        <div className="small">
                          Reason: <code>{result?.reason || "unknown_error"}</code>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tiny CSS */}
      <style>{`
        .stepper .circle { width: 36px; height: 36px; font-size: .9rem; }
        .shadow-inner { box-shadow: inset 0 1px 2px rgba(0,0,0,.12); }
        .stepper-on-dark .stepper-progress { --bs-progress-bg: rgba(255,255,255,.40); }
        .stepper-on-dark .stepper-progress .progress-bar { background-color: #fff; }
        .stepper-on-dark .circle.todo { background: rgba(255,255,255,.92) !important; color: #6c757d !important; border: 1px solid rgba(255,255,255,.6); }
        .stepper-on-dark .circle.current { background: #fff !important; color: var(--bs-success) !important; box-shadow: 0 0 0 .35rem rgba(255,255,255,.25); border: 1px solid rgba(255,255,255,.7); }
        .stepper-on-dark .circle.done { background: #fff !important; color: var(--bs-success) !important; border: 1px solid rgba(255,255,255,.6); }
        .stepper-on-dark .label.todo { color: rgba(255,255,255,.9) !important; }
        .stepper-on-dark .label.current, .stepper-on-dark .label.done { color: #fff !important; }
      `}</style>
    </main>
  );
}
