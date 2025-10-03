// src/features/draft_vc/vcService.js
import axios from "axios";
import { API_URL } from "../../../config";
import qs from "qs";

const createDrafts = async (drafts) => {
  console.log("👉 Posting draft payload:", drafts);
  const res = await axios.post(`${API_URL}/api/web/draft`, drafts);
  return res.data;
};

const getDrafts = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,   // ✅ send query params
  };
 const res = await axios.get(`${API_URL}/api/web/draft`, config);
  return res.data;
};

const deleteDraft = async (id) => {
  const res = await axios.delete(`${API_URL}/api/web/draft/${id}`);
  return res.data;
};

const vcService = {
  createDrafts,
  getDrafts,
  deleteDraft,
};

export default vcService;
