import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_URL as CONFIG_API_URL } from "../../../../config";

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

/* ============================== Page ============================== */
export default function VerificationPortal() {
  const { sessionId } = useParams();
  const location = useLocation();

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const cidFromUrl = qs.get("credential_id") || "";           // 👈 present in link?
  const hasCidInLink = !!cidFromUrl;                          // 👈 drives the 3-step vs 4-step UI

  // steps definition depends on presence of credential_id in URL
  const steps = hasCidInLink
    ? [{ label: "Fill up" }, { label: "Request permission" }, { label: "Result" }]
    : [{ label: "Fill up" }, { label: "Provide VC Barcode" }, { label: "Request permission" }, { label: "Result" }];

  // numeric step (1-based, for the stepper)
  const [step, setStep] = useState(1);

  // Step 1: form (local only; not saved yet)
  const [form, setForm] = useState({
    name: "",
    org: "",
    purpose: "Credential verification",
  });
  const formReady = form.name.trim() && form.org.trim();

  // Step 2 (only when !hasCidInLink): decode VC barcode/paste link (client-side only)
  const [pastedLink, setPastedLink] = useState("");
  const [qrError, setQrError] = useState("");
  const [extractedCid, setExtractedCid] = useState(cidFromUrl); // seed from URL if present

  // Step 3/Result: waiting & result
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef(false);

  // for holder deep link / QR (optional helper panel)
  const sessionDeepLink =
    (typeof window !== "undefined" ? window.location.origin : "") + `/verify/${sessionId}?from=mobile`;

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

  async function pollUntilResult({ timeoutMs = 120000 } = {}) {
    pollingRef.current = true;
    setProgress(10);

    // soft animation while polling
    (async () => {
      for (const m of [25, 42, 66, 82, 93]) {
        await sleep(450);
        if (!pollingRef.current) return;
        setProgress((p) => (p < m ? m : p));
      }
    })();

    const start = Date.now();
    while (pollingRef.current) {
      const r = await fetch(`${API_BASE}/api/verification/session/${sessionId}`, { cache: "no-store" });
      const data = await r.json();
      const reason = data?.result?.reason;
      if (reason && reason !== "pending") {
        setResult(data.result);
        setProgress(100);
        pollingRef.current = false;
        setStep(hasCidInLink ? 3 : 4); // 👈 result step depends on how many steps we have
        return;
      }
      if (Date.now() - start > timeoutMs) {
        setResult({ valid: false, reason: "timeout_waiting_for_holder" });
        setStep(hasCidInLink ? 3 : 4);
        pollingRef.current = false;
        return;
      }
      await sleep(800);
    }
  }

  // ---- Step 2 helpers (only used if !hasCidInLink) ----
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

        let parsedCid = "";
        // JSON -> credential_id
        try {
          const o = JSON.parse(text);
          if (o && o.credential_id) parsedCid = String(o.credential_id);
        } catch {
          // URL -> ?credential_id=
          try {
            const u = new URL(text);
            parsedCid = u.searchParams.get("credential_id") || "";
          } catch {}
        }
        if (!parsedCid) throw new Error("QR missing credential_id");
        setExtractedCid(parsedCid);
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
      const cid = u.searchParams.get("credential_id");
      if (cid) setExtractedCid(cid);
    } catch {
      /* ignore non-URL */
    }
  }

  // ---- Step "Request permission": call /begin only (never /present) ----
  async function requestPermission() {
    const cid = extractedCid || cidFromUrl;
    if (!formReady || !cid) return;
    setBusy(true);
    try {
      await postJSON(`/verification/session/${sessionId}/begin`, {
        org: form.org.trim(),
        contact: form.name.trim(),
        purpose: form.purpose.trim() || "Credential verification",
      });
      // Holder's phone will present after they approve; we just wait.
      setBusy(false);
      // stay on the "Request permission" step while waiting
      pollUntilResult();
    } catch (err) {
      setBusy(false);
      alert(err.message || "Failed to request permission");
    }
  }

  // keep extractedCid seeded from URL (one-time)
  useEffect(() => {
    if (cidFromUrl) setExtractedCid(cidFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="bg-success-subtle bg-gradient min-vh-100">
      {/* Header */}
      <header className="bg-success text-white">
        <div className="container py-3 d-flex align-items-center gap-3">
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
      </header>

      {/* Stepper on dark header */}
      <div className="bg-success text-white">
        <div className="container py-4">
          <Stepper step={step} steps={steps} onDark />
        </div>
      </div>

      {/* Card */}
      <section className="container">
        <div className="card shadow-sm mt-n4">
          <div className="card-body p-4 p-md-5">
            {/* Step 1: Fill up (local only) */}
            {step === 1 && (
              <>
                <h2 className="h3 fw-bold text-dark">Fill up your details</h2>
                <p className="text-muted mb-4">We will ask the holder’s permission before any verification.</p>

                <form
                  className="row g-3 align-items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!formReady) return;
                    // If credential_id is already in the link, jump straight to "Request permission"
                    setStep(hasCidInLink ? 2 : 2); // step 2 is different depending on flow
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

                  <div className="col-12 pt-2">
                    <button type="submit" disabled={!formReady} className="btn btn-success fw-semibold">
                      Next
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Step 2: Either "Provide VC Barcode" (no cid) OR "Request permission" (has cid) */}
            {!hasCidInLink && step === 2 && (
              <>
                <h2 className="h3 fw-bold text-dark">Provide the VC barcode</h2>
                <p className="text-muted">Upload a QR image or paste a link that contains the credential.</p>

                <div className="row g-4 mt-2">
                  <div className="col-lg-7">
                    <div className="border rounded-3 p-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge text-bg-secondary">Option A</span>
                        <strong>Paste link</strong>
                      </div>
                      <input
                        className="form-control"
                        placeholder="Paste link with ?credential_id=..."
                        value={pastedLink}
                        onChange={(e) => tryExtractCidFromLink(e.target.value)}
                      />
                      <div className="form-text">We’ll extract <code>credential_id</code> if present (no upload).</div>

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
                        <div className="small text-muted">Detected credential id:</div>
                        <code className="small">{extractedCid || "—"}</code>
                      </div>

                      <div className="mt-3 d-flex gap-2">
                        <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                          Back
                        </button>
                        <button
                          className="btn btn-success fw-semibold"
                          disabled={!extractedCid}
                          onClick={() => setStep(3)}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Optional helper for the holder */}
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
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1400);
                            } catch {}
                          }}
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* When the link already has credential_id, step 2 is the "Request permission" view */}
            {hasCidInLink && step === 2 && (
              <>
                <h2 className="h3 fw-bold text-dark">Request permission</h2>
                <p className="text-muted">We’ll ask the holder to approve sending their credential.</p>

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
                      <div className="fw-semibold">{form.purpose || "Credential verification"}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="small text-muted mt-2">Credential ID (from link)</div>
                      <div className="fw-semibold"><code>{extractedCid}</code></div>
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button
                      className="btn btn-success fw-semibold"
                      disabled={busy || !formReady || !extractedCid}
                      onClick={requestPermission}
                    >
                      {busy ? "Requesting…" : "Request permission"}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="spinner-border spinner-border-sm text-success" role="status" />
                    <span className="text-dark">Waiting for holder to approve…</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </>
            )}

            {/* In the 4-step flow, step 3 is the "Request permission" view */}
            {!hasCidInLink && step === 3 && (
              <>
                <h2 className="h3 fw-bold text-dark">Request permission</h2>
                <p className="text-muted">We’ll ask the holder to approve sending their credential.</p>

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
                      <div className="fw-semibold">{form.purpose || "Credential verification"}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="small text-muted mt-2">Credential ID (decoded)</div>
                      <div className="fw-semibold"><code>{extractedCid}</code></div>
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setStep(2)}>
                      Back
                    </button>
                    <button
                      className="btn btn-success fw-semibold"
                      disabled={busy || !formReady || !extractedCid}
                      onClick={requestPermission}
                    >
                      {busy ? "Requesting…" : "Request permission"}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="spinner-border spinner-border-sm text-success" role="status" />
                    <span className="text-dark">Waiting for holder to approve…</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </>
            )}

            {/* Result (step 3 in 3-step flow; step 4 in 4-step flow) */}
            {(hasCidInLink ? step === 3 : step === 4) && (
              <>
                <h2 className="h3 fw-bold text-dark">Result</h2>
                {result?.valid ? (
                  <div className="alert alert-success mt-3 mb-0">
                    <div className="fw-semibold">Credential is valid.</div>
                    <div className="small">
                      {result.reason === "not_anchored"
                        ? "Note: Valid, but not anchored yet."
                        : "All checks passed."}
                    </div>
                  </div>
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
