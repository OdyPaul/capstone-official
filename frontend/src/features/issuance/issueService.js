// src/features/issuance/issueService.js
import axios from "axios";
import { API_URL } from "../../../config";
import qs from "qs";

const BASE_URL = `${API_URL}/api/web/issuance`;

// 🔹 Issue credentials (batch) → POST /api/web/issuance/issue
const issueCredentials = async (payload, token) => {
  console.log("👉 Issuance payload:", payload);

  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const res = await axios.post(`${BASE_URL}/issue`, payload, config);
  return res.data;
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
    