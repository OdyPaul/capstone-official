// src/features/template/templateService.js
import axios from "axios";
import { API_URL } from "../../../config";
import qs from "qs";

const BASE = `${API_URL}/api/web/templates`;

/* ---------- helpers (minimal pass-through) ---------- */
const normalizeAttribute = (a = {}) => {
  // We’re keeping minimal fields only: key, title, type, required, path, description
  const { key, title, type, required, path, description } = a;
  return { key, title, type, required, path, description };
};

const normalizePayload = (tpl = {}) => {
  const attributes = Array.isArray(tpl.attributes)
    ? tpl.attributes.map(normalizeAttribute)
    : [];
  const out = { ...tpl, attributes };
  return out;
};

/* ---------- API calls ---------- */
const getTemplates = async (filters = {}, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
  };
  const res = await axios.get(BASE, config);
  return res.data;
};

const getTemplateById = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.get(`${BASE}/${id}`, config);
  return res.data;
};

const getTemplatePreview = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.get(`${BASE}/${id}/preview`, config);
  return res.data; // { _id, name, slug, version, lastUpdated, attributes: [] }
};

const createTemplate = async (payload, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  const body = normalizePayload(payload);
  const res = await axios.post(BASE, body, config);
  return res.data;
};

const updateTemplate = async (id, data, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  const body = normalizePayload(data);
  const res = await axios.put(`${BASE}/${id}`, body, config);
  return res.data;
};

const deleteTemplate = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.delete(`${BASE}/${id}`, config);
  return res.data;
};

const templateService = {
  getTemplates,
  getTemplateById,
  getTemplatePreview,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};

export default templateService;
