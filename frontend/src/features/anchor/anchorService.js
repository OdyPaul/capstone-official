import axios from "axios";
import qs from "qs";
import { API_URL } from "../../../config";

const paramsSer = (p) => qs.stringify(p, { arrayFormat: "repeat" });
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ---- Queue APIs ----
const requestNow = async (credId, token) => {
  const { data } = await axios.post(
    `${API_URL}/api/web/anchor/now/${encodeURIComponent(credId)}`,
    {},
    auth(token)
  );
  return data;
};

const listQueue = async (filters = {}, token) => {
  const config = { ...auth(token), params: filters, paramsSerializer: paramsSer };
  const { data } = await axios.get(`${API_URL}/api/web/anchor/queue`, config);
  return data;
};

const approveQueued = async ({ credIds = [], approved_mode }, token) => {
  const { data } = await axios.post(
    `${API_URL}/api/web/anchor/approve`,
    { credIds, approved_mode },
    auth(token)
  );
  return data;
};

const runSingle = async (credId, token) => {
  const { data } = await axios.post(
    `${API_URL}/api/web/anchor/run-single/${encodeURIComponent(credId)}`,
    {},
    auth(token)
  );
  return data;
};

// ✅ supports ?mode=now|batch|all
const mintBatch = async (token, { mode = "now" } = {}) => {
  const config = { ...auth(token), params: { mode }, paramsSerializer: paramsSer };
  const { data } = await axios.post(`${API_URL}/api/web/anchor/mint-batch`, {}, config);
  return data;
};

// ---------- NEW: list anchored batches ----------
const listAnchorBatches = async ({ limit = 200, chain_id } = {}, token) => {
  const params = { limit };
  if (chain_id != null) params.chain_id = chain_id;
  const config = { ...auth(token), params, paramsSerializer: paramsSer };
  const { data } = await axios.get(`${API_URL}/api/web/anchor/batches`, config);
  return Array.isArray(data) ? data : [];
};

// ---- Non-"now" lists via server (lighter than client-side filtering) ----
const listNonNowAged = async ({ minDays = 0, maxDays = 15 } = {}, token) => {
  const config = { ...auth(token), params: { minDays, maxDays }, paramsSerializer: paramsSer };
  const { data } = await axios.get(`${API_URL}/api/web/anchor/non-now`, config);
  return data;
};

const listRecentNonAnchorSigned = async ({ days = 15 } = {}, token) => {
  const range = Number(days) <= 15 ? { minDays: 0, maxDays: 15 } : { minDays: 15, maxDays: 30 };
  return listNonNowAged(range, token);
};

// Helper for “today queued” badge
const listQueueTodayFromAll = (queue = []) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date();   end.setHours(23, 59, 59, 999);
  return (Array.isArray(queue) ? queue : []).filter((q) => {
    const t = q?.anchoring?.requested_at || q?.createdAt || q?.created_at;
    const ts = t ? new Date(t).getTime() : 0;
    return ts >= start.getTime() && ts <= end.getTime();
  });
};

const anchorService = {
  requestNow,
  listQueue,
  approveQueued,
  runSingle,
  mintBatch,
  listRecentNonAnchorSigned,
  listQueueTodayFromAll,
  // NEW
  listAnchorBatches,
};

export default anchorService;
