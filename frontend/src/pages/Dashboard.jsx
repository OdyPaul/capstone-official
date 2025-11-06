// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import Chart from "react-apexcharts";
import { API_URL } from "../../config";
import { FaEllipsisH } from "react-icons/fa";

// ---------- Ranges ----------
const RANGE_OPTIONS = [
  { key: "all",   label: "All Time" },
  { key: "6m",    label: "6 Months" },
  { key: "3m",    label: "3 Months" },
  { key: "1m",    label: "1 Month"  },
  { key: "1w",    label: "1 Week"   },
  { key: "today", label: "Today"    },
];
const rangeLabel = (key) => RANGE_OPTIONS.find((o) => o.key === key)?.label || key;

// ---------- Small KPI card WITH 3-dot menu ----------
function CardKpi({ title, value, sub, range, onRangeChange, isLoading }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="col-md-3 col-lg-2 mb-3 position-relative">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">{title}</div>
            <div className="dropdown">
              <FaEllipsisH
                size={14}
                className="text-muted"
                style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
                onClick={() => !isLoading && setOpen((p) => !p)}
                aria-label="Change range"
              />
              {open && (
                <div
                  className="dropdown-menu show position-absolute end-0 mt-2 p-1"
                  style={{ fontSize: "0.8rem", minWidth: 140, zIndex: 1000 }}
                  onMouseLeave={() => setOpen(false)}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      className={`dropdown-item ${range === opt.key ? "active" : ""}`}
                      disabled={isLoading}
                      onClick={() => {
                        onRangeChange(opt.key);
                        setOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="h4 mb-0 mt-1">
            {isLoading ? (
              <span className="spinner-border spinner-border-sm text-primary" role="status" />
            ) : (
              value
            )}
          </div>
          <div className="text-muted small mt-1">{sub || rangeLabel(range)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Simple KPI card (NO menu) ----------
function CardKpiSimple({ title, value, sub }) {
  return (
    <div className="col-md-3 col-lg-2 mb-3">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <div className="text-muted small">{title}</div>
          <div className="h4 mb-0 mt-1">{value}</div>
          {sub && <div className="text-muted small mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
const todayKeyLocal = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const fmtHms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}h ${mm}m ${ss}s`;
};

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const token = user?.token;
  const userId = user?._id || "me";

  // Per-card ranges
  const [studentsRange, setStudentsRange] = useState("all");
  const [draftsRange, setDraftsRange] = useState("1w");
  const [issuedRange, setIssuedRange] = useState("1w");
  const [anchoredRange, setAnchoredRange] = useState("1w");
  const [revenueRange, setRevenueRange] = useState("all");

  // KPI values
  const [studentsVal, setStudentsVal] = useState(0);
  const [draftsVal, setDraftsVal] = useState(0);
  const [issuedVal, setIssuedVal] = useState(0);
  const [anchoredVal, setAnchoredVal] = useState(0);
  const [revenueVal, setRevenueVal] = useState(0);

  // Logged Time (local, second-by-second)
  const [loggedMsLocal, setLoggedMsLocal] = useState(0);
  const LS_PREFIX = `LT_${userId}_`;
  const LS_DAY = `${LS_PREFIX}day`;
  const LS_ACC = `${LS_PREFIX}acc_ms`;
  const LS_START = `${LS_PREFIX}start_ts`;
  const LS_INIT = `${LS_PREFIX}seeded`;

  // Charts
  const [chartRange, setChartRange] = useState("1w");
  const [line, setLine] = useState({ categories: [], series: [{ name: "Requests", data: [] }] });
  const [pie, setPie] = useState({ labels: [], series: [] });

  // Boot + error
  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState("");

  // Per-widget loading flags
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [issuedLoading, setIssuedLoading] = useState(false);
  const [anchoredLoading, setAnchoredLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false); // affects both line & donut

  const tickRef = useRef(null);
  const flushRef = useRef(null);

  // ---- API helper with cache & abort ----
  const STATS_URL = `${API_URL}/api/web/stats/admin/stats/overview`;
  const cacheRef = useRef(new Map());

  const fetchStats = async (rangeKey, signal) => {
    const cacheKey = rangeKey;
    if (cacheRef.current.has(cacheKey)) return cacheRef.current.get(cacheKey);

  // read seed from Loading.jsx (only for "1w" but you could generalize)
   const seedKey = `DASH_SEED_${rangeKey}`;
   try {
     const seeded = sessionStorage.getItem(seedKey);
     if (seeded) {
       const data = JSON.parse(seeded);
       const safe = {
         totals: {
           students: Number(data?.totals?.students ?? 0),
           drafts: Number(data?.totals?.drafts ?? 0),
           issuedActive: Number(data?.totals?.issuedActive ?? 0),
           anchored: Number(data?.totals?.anchored ?? 0),
           revenuePhp: Number(data?.totals?.revenuePhp ?? 0),
           loggedMs: Number(data?.totals?.loggedMs ?? 0),
         },
         line: {
           categories: Array.isArray(data?.line?.categories) ? data.line.categories : [],
           series: Array.isArray(data?.line?.series) && data.line.series.length
             ? data.line.series.map((s) => ({
                 name: String(s.name || "Series"),
                 data: (s.data || []).map((n) => (Number.isFinite(+n) ? +n : 0)),
               }))
             : [{ name: "Requests", data: [] }],
         },
         pie: {
           labels: Array.isArray(data?.pie?.labels) ? data.pie.labels : [],
           series: Array.isArray(data?.pie?.series) ? data.pie.series.map((n) => (Number.isFinite(+n) ? +n : 0)) : [],
         },
       };
       cacheRef.current.set(cacheKey, safe);
       return safe; // skip network for the first paint
     }
   } catch { /* ignore bad JSON */ }

    const url = `${STATS_URL}?range=${encodeURIComponent(rangeKey)}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });

    const data = res.data || {};
    const safe = {
      totals: {
        students: Number(data?.totals?.students ?? 0),
        drafts: Number(data?.totals?.drafts ?? 0),
        issuedActive: Number(data?.totals?.issuedActive ?? 0),
        anchored: Number(data?.totals?.anchored ?? 0),
        revenuePhp: Number(data?.totals?.revenuePhp ?? 0),
        loggedMs: Number(data?.totals?.loggedMs ?? 0),
      },
      line: {
        categories: Array.isArray(data?.line?.categories) ? data.line.categories : [],
        series:
          Array.isArray(data?.line?.series) && data.line.series.length
            ? data.line.series.map((s) => ({
                name: String(s.name || "Series"),
                data: (s.data || []).map((n) => (Number.isFinite(+n) ? +n : 0)),
              }))
            : [{ name: "Requests", data: [] }],
      },
      pie: {
        labels: Array.isArray(data?.pie?.labels) ? data.pie.labels : [],
        series: Array.isArray(data?.pie?.series) ? data.pie.series.map((n) => (Number.isFinite(+n) ? +n : 0)) : [],
      },
    };

    cacheRef.current.set(cacheKey, safe);
    return safe;
  };

  // Loaders
  const loadStudents = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      setStudentsVal(s.totals.students);
    } catch {
      setStudentsVal(0);
    }
  };
  const loadDrafts = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      const sum = (s.line.series?.[0]?.data || []).reduce((a, n) => a + (Number(n) || 0), 0);
      setDraftsVal(sum);
    } catch {
      setDraftsVal(0);
    }
  };
  const loadIssued = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      setIssuedVal(Number(s.pie.series?.[1] ?? 0));
    } catch {
      setIssuedVal(0);
    }
  };
  const loadAnchored = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      setAnchoredVal(Number(s.pie.series?.[2] ?? 0));
    } catch {
      setAnchoredVal(0);
    }
  };
  const loadRevenue = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      const issued = Number(s.pie.series?.[1] ?? 0);
      setRevenueVal(issued * 250);
    } catch {
      setRevenueVal(0);
    }
  };
  const loadCharts = async (r, signal) => {
    try {
      const s = await fetchStats(r, signal);
      setLine(s.line);
      setPie(s.pie);
    } catch {
      setLine({ categories: [], series: [{ name: "Requests", data: [] }] });
      setPie({ labels: [], series: [] });
    }
  };

  // Seed today's baseline for Logged Time from server ONCE per day, then tick locally
  const seedLoggedTimeOnce = async () => {
    try {
      const day = todayKeyLocal();
      const storedDay = localStorage.getItem(LS_DAY);

      if (storedDay !== day) {
        localStorage.setItem(LS_DAY, day);
        localStorage.setItem(LS_ACC, "0");
        localStorage.removeItem(LS_START);
        localStorage.removeItem(LS_INIT);
      }

      if (localStorage.getItem(LS_INIT) !== "1") {
        const s = await fetchStats("today");
        const serverMs = Math.max(0, Number(s.totals.loggedMs || 0));
        localStorage.setItem(LS_ACC, String(serverMs));
        localStorage.setItem(LS_DAY, day);
        localStorage.setItem(LS_INIT, "1");
        // Do NOT set LS_START here; startTicking() handles it.
      }
    } catch {
      const day = todayKeyLocal();
      if (!localStorage.getItem(LS_DAY)) localStorage.setItem(LS_DAY, day);
      if (!localStorage.getItem(LS_ACC)) localStorage.setItem(LS_ACC, "0");
      // Do NOT set LS_START here either; startTicking() handles it.
    }
  };

  // Tickers
  const startTicking = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (flushRef.current) clearInterval(flushRef.current);

    // Start a new foreground session now
    localStorage.setItem(LS_START, String(Date.now()));

    // Visual tick every 1s
    tickRef.current = setInterval(() => {
      try {
        const day = todayKeyLocal();
        const storedDay = localStorage.getItem(LS_DAY);
        if (storedDay && storedDay !== day) {
          localStorage.setItem(LS_DAY, day);
          localStorage.setItem(LS_ACC, "0");
          localStorage.setItem(LS_START, String(Date.now()));
          localStorage.removeItem(LS_INIT);
        }
        const acc = Number(localStorage.getItem(LS_ACC) || "0");
        const start = Number(localStorage.getItem(LS_START) || "0");
        const runningDelta = start ? Date.now() - start : 0;
        setLoggedMsLocal(acc + runningDelta);
      } catch {
        /* noop */
      }
    }, 1000);

    // Persist progress every 5s
    flushRef.current = setInterval(() => {
      try {
        const acc = Number(localStorage.getItem(LS_ACC) || "0");
        const start = Number(localStorage.getItem(LS_START) || "0");
        const now = Date.now();
        const total = acc + (start ? now - start : 0);
        localStorage.setItem(LS_ACC, String(total));
        localStorage.setItem(LS_START, String(now)); // roll forward
      } catch {
        /* noop */
      }
    }, 5000);
  };

  const stopTicking = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (flushRef.current) clearInterval(flushRef.current);
    tickRef.current = null;
    flushRef.current = null;
  };

  // Final flush on unload (stop counting when tab/app is closed)
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const acc = Number(localStorage.getItem(LS_ACC) || "0");
        const start = Number(localStorage.getItem(LS_START) || "0");
        const now = Date.now();
        const total = acc + (start ? now - start : 0);
        localStorage.setItem(LS_ACC, String(total));
        localStorage.removeItem(LS_START); // important: do not keep start across sessions
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [userId]);

  // Bootstrap once
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    (async () => {
      try {
        setBooting(true);
        setErr("");
        cacheRef.current.clear();

        await seedLoggedTimeOnce();
        startTicking();

        await Promise.all([
          loadStudents(studentsRange, controller.signal),
          loadDrafts(draftsRange, controller.signal),
          loadIssued(issuedRange, controller.signal),
          loadAnchored(anchoredRange, controller.signal),
          loadRevenue(revenueRange, controller.signal),
          loadCharts(chartRange, controller.signal),
        ]);
      } catch (e) {
        if (!axios.isCancel(e)) {
          setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard");
        }
      } finally {
        setBooting(false);
      }
    })();

    return () => {
      try {
        const acc = Number(localStorage.getItem(LS_ACC) || "0");
        const start = Number(localStorage.getItem(LS_START) || "0");
        const now = Date.now();
        const total = acc + (start ? now - start : 0);
        localStorage.setItem(LS_ACC, String(total));
        localStorage.removeItem(LS_START); // stop counting while unmounted/logged out
      } catch {
        /* ignore */
      }
      controller.abort();
      stopTicking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  // Per-widget effects (only toggle that widget’s spinner)
  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setStudentsLoading(true);
    loadStudents(studentsRange, c.signal).finally(() => setStudentsLoading(false));
    return () => c.abort();
  }, [token, studentsRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setDraftsLoading(true);
    loadDrafts(draftsRange, c.signal).finally(() => setDraftsLoading(false));
    return () => c.abort();
  }, [token, draftsRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setIssuedLoading(true);
    loadIssued(issuedRange, c.signal).finally(() => setIssuedLoading(false));
    return () => c.abort();
  }, [token, issuedRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setAnchoredLoading(true);
    loadAnchored(anchoredRange, c.signal).finally(() => setAnchoredLoading(false));
    return () => c.abort();
  }, [token, anchoredRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setRevenueLoading(true);
    loadRevenue(revenueRange, c.signal).finally(() => setRevenueLoading(false));
    return () => c.abort();
  }, [token, revenueRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    setChartLoading(true);
    loadCharts(chartRange, c.signal).finally(() => setChartLoading(false));
    return () => c.abort();
  }, [token, chartRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart options
  const lineOptions = useMemo(
    () => ({
      chart: { id: "vc-requests", toolbar: { show: false } },
      stroke: { curve: "smooth", width: 3 },
      dataLabels: { enabled: false },
      xaxis: { categories: line.categories },
      yaxis: {
        title: { text: "Requests (count)" },
        labels: { formatter: (v) => (Number.isFinite(v) ? v.toFixed(0) : v) },
      },
      fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
      tooltip: { y: { formatter: (v) => `${v} request${v === 1 ? "" : "s"}` } },
      noData: { text: "No data available" },
    }),
    [line.categories]
  );

  const pieOptions = useMemo(
    () => ({
      chart: { id: "vc-breakdown" },
      labels: pie.labels,
      legend: { position: "bottom" },
      tooltip: { y: { formatter: (v) => `${v} items` } },
      noData: { text: "No data available" },
    }),
    [pie.labels]
  );

  const peso = (n) => `₱${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <>
      <section className="heading mb-3">
        <h2>Dashboard</h2>
        <p className="text-muted">Streamline your workflow with our intuitive dashboard.</p>
      </section>

      {err && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {err}
        </div>
      )}

      {booting ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="row g-3">
            <CardKpi
              title="Total Student Profile"
              value={studentsVal.toLocaleString()}
              range={studentsRange}
              onRangeChange={setStudentsRange}
              isLoading={studentsLoading}
            />
            <CardKpi
              title="Draft Data"
              value={draftsVal.toLocaleString()}
              range={draftsRange}
              onRangeChange={setDraftsRange}
              isLoading={draftsLoading}
            />
            <CardKpi
              title="Issued Active"
              value={issuedVal.toLocaleString()}
              range={issuedRange}
              onRangeChange={setIssuedRange}
              isLoading={issuedLoading}
            />
            <CardKpi
              title="Anchored"
              value={anchoredVal.toLocaleString()}
              range={anchoredRange}
              onRangeChange={setAnchoredRange}
              isLoading={anchoredLoading}
            />
            <CardKpi
              title="Revenue"
              value={peso(revenueVal)}
              range={revenueRange}
              onRangeChange={setRevenueRange}
              isLoading={revenueLoading}
            />
            <CardKpiSimple title="Logged Time" value={fmtHms(loggedMsLocal)} sub="Today (local)" />
          </div>

          {/* Charts */}
          <div className="row g-3 mt-1">
            <div className="col-lg-8">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold">Recent VC Requests</div>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Chart Range">
                      {RANGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setChartRange(opt.key)}
                          className={`btn ${chartRange === opt.key ? "btn-primary" : "btn-outline-primary"}`}
                          disabled={chartLoading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="position-relative" style={{ minHeight: 320 }}>
                    {chartLoading && (
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-50"
                        style={{ zIndex: 2 }}
                      >
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading…</span>
                        </div>
                      </div>
                    )}
                    <Chart
                      type="area"
                      height={320}
                      series={line.series?.length ? line.series : [{ name: "Requests", data: [] }]}
                      options={lineOptions}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Requests Breakdown</div>
                  <div className="position-relative" style={{ minHeight: 320 }}>
                    {chartLoading && (
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-50"
                        style={{ zIndex: 2 }}
                      >
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading…</span>
                        </div>
                      </div>
                    )}
                    <Chart
                      type="donut"
                      height={320}
                      series={Array.isArray(pie.series) ? pie.series : []}
                      options={pieOptions}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
