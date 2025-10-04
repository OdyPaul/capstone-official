// src/features/draft_vc/vcService.js
import axios from "axios";
import { API_URL } from "../../../config";
import qs from "qs";

// 🔹 Create draft(s)
const createDrafts = async (drafts, token) => {
  console.log("👉 Posting draft payload:", drafts);

  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const res = await axios.post(`${API_URL}/api/web/draft`, drafts, config);
  return res.data;
};

// 🔹 Get drafts with filters
const getDrafts = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,   // ✅ send query params
    paramsSerializer: (params) =>
      qs.stringify(params, { arrayFormat: "repeat" }),
  };

  const res = await axios.get(`${API_URL}/api/web/draft`, config);
  return res.data;
};

// 🔹 Delete draft
const deleteDraft = async (id, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const res = await axios.delete(`${API_URL}/api/web/draft/${id}`, config);
  return res.data;
};

const vcService = {
  createDrafts,
  getDrafts,
  deleteDraft,
};

export default vcService;
