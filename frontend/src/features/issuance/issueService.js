import axios from "axios";
import { API_URL } from "../../../config";
import qs from "qs";

const BASE_URL = `${API_URL}/api/web/issuance`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Issue credentials (batch) via QUEUE → POST /issue/queue + poll /issue/queue/:jobId
const issueCredentials = async (payload, token, options = {}) => {
  console.log("👉 Issuance payload:", payload);
  const { onProgress } = options || {};

  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // 1) enqueue batch job
  const startRes = await axios.post(
    `${BASE_URL}/issue/queue`,
    payload,
    config
  );
  const { jobId, total } = startRes.data || {};

  if (!jobId) {
    throw new Error("Missing jobId from queue response");
  }

  const totalFromPayload =
    total ||
    (Array.isArray(payload.recipients) ? payload.recipients.length : 0) ||
    0;

  if (typeof onProgress === "function") {
    onProgress({
      total: totalFromPayload,
      processed: 0,
      created: 0,
      duplicates: 0,
      errors: 0,
    });
  }

  // 2) poll job status
  const maxAttempts = 600; // ~10 minutes @ 1s
  const intervalMs = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const statusRes = await axios.get(
      `${BASE_URL}/issue/queue/${jobId}`,
      config
    );
    const info = statusRes.data || {};
    const prog = info.progress || {};
    const state = info.state || "unknown";

    const totalFromJob =
      prog.total ??
      totalFromPayload ??
      (Array.isArray(payload.recipients) ? payload.recipients.length : 0) ??
      0;

    const progressSnapshot = {
      total: totalFromJob,
      processed: prog.processed ?? 0,
      created: prog.created ?? 0,
      duplicates: prog.duplicates ?? 0,
      errors: prog.errors ?? 0,
    };

    if (typeof onProgress === "function") {
      onProgress(progressSnapshot);
    }

    if (state === "completed") {
      const rv = info.result || {};
      const results = Array.isArray(rv.results) ? rv.results : [];

      const createdArr = results
        .filter((r) => r.status === "created")
        .map((r) => r.issue);
      const dupArr = results
        .filter((r) => r.status === "duplicate")
        .map((r) => r.issue);
      const errArr = results.filter((r) => r.status === "error");

      return {
        createdCount: createdArr.length,
        duplicateCount: dupArr.length,
        errorCount: errArr.length,
        created: createdArr,
        duplicates: dupArr,
        errors: errArr,
      };
    }

    if (state === "failed") {
      const msg =
        info.failedReason || info.message || "Batch issuance job failed";
      throw new Error(msg);
    }

    // waiting / active / delayed...
    await sleep(intervalMs);
  }

  throw new Error("Batch issuance timed out. Please try again.");
};

// 🔹 List issued credentials → GET /api/web/issuance/issue
const getIssues = async (filters = {}, token) => {
  const defaults = {
    range: "1m",
    program: "All",
    type: "All",
    status: "All",
    q: "",
    orderNo: "",
    receiptNo: "",
    unpaidOnly: false,
  };
  const f = { ...defaults, ...(filters || {}) };

  const params = {
    ...(f.range && f.range !== "All" ? { range: f.range } : {}),
    ...(f.program && f.program !== "All" ? { program: f.program } : {}),
    ...(f.type && f.type !== "All" ? { type: f.type } : {}),
    ...(f.status && f.status !== "All" ? { status: f.status } : {}),
    ...(f.q ? { q: f.q } : {}),
    ...(f.orderNo ? { orderNo: f.orderNo } : {}),
    ...(f.receiptNo ? { receiptNo: f.receiptNo } : {}),
    ...(typeof f.unpaidOnly === "boolean" ? { unpaidOnly: f.unpaidOnly } : {}),
  };

  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params,
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat: "repeat" }),
  };

  const res = await axios.get(`${BASE_URL}/issue`, config);
  return res.data;
};

// 🔹 Delete one issued record → DELETE /api/web/issuance/issue/:id
const deleteIssue = async (id, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const res = await axios.delete(`${BASE_URL}/issue/${id}`, config);
  return res.data;
};

const issueService = {
  issueCredentials,
  getIssues,
  deleteIssue,
};

export default issueService;
