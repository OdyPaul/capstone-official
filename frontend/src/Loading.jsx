// src/pages/Loading.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";

const DASHBOARD_URL = (range) =>
  `${API_URL}/api/web/stats/admin/stats/overview?range=${encodeURIComponent(range)}`;

export default function Loading() {
  const { user } = useSelector((s) => s.auth);
  const token = user?.token;
  const navigate = useNavigate();

  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState("Preparing…");
  const [error, setError] = useState("");

  const authGet = async (url, signal) =>
    axios.get(url, { headers: { Authorization: `Bearer ${token}` }, signal });

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        setError("");
        setPct(5);
        setMsg("Starting…");

        // 1) Preload dashboard (and optionally seed a fast paint)
        setMsg("Loading dashboard data…");
        const { data } = await authGet(DASHBOARD_URL("1w"), controller.signal);
        try { sessionStorage.setItem("DASH_SEED_1w", JSON.stringify(data ?? {})); } catch {}

        setPct(95);
        setMsg("Finalizing…");
        setPct(100);
        setTimeout(() => navigate("/"), 250);
      } catch (e) {
        if (!axios.isCancel(e)) {
          setError(e?.response?.data?.message || e?.message || "Failed to prepare the admin page.");
          setMsg("Something went wrong.");
          setPct(0);
        }
      }
    })();

    return () => controller.abort();
  }, [token, navigate]);

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light p-3">
      <div className="dots mb-4" aria-hidden="true">
        <span className="dot d1" /><span className="dot d2" /><span className="dot d3" /><span className="dot d4" /><span className="dot d5" />
      </div>

      <h5 className="text-muted text-center mb-3">The admin page is loading — please wait</h5>

      <div className="w-100" style={{ maxWidth: 520 }}>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className={`progress-bar progress-bar-striped ${pct < 100 ? "progress-bar-animated" : ""}`} style={{ width: `${pct}%` }}>
            {pct}%
          </div>
        </div>
        <div className="small text-muted mt-2">{msg}</div>

        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      </div>

      <style>{`
        .dots { display: flex; gap: 10px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #0d6efd; display: inline-block; animation: bounce 1s infinite ease-in-out; transform-origin: center bottom; }
        .d1 { animation-delay: 0s; } .d2 { animation-delay: .1s; } .d3 { animation-delay: .2s; } .d4 { animation-delay: .3s; } .d5 { animation-delay: .4s; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-10px)} }
      `}</style>
    </div>
  );
}
