// src/features/verify/verifyService.js
import axios from "axios";
import { API_URL } from "../../../config";

const base = `${API_URL}/api/verification-request`;

// GET /api/verification-request?page=&limit=&q=&status=
const listRequests = async (params = {}, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params,
  };

  const { data } = await axios.get(base, config);
  // { items, total, page, limit }
  return data;
};

// GET /api/verification-request/:id
const getRequestById = async (id, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const { data } = await axios.get(`${base}/${id}`, config);
  return data;
};

// POST /api/verification-request/:id/verify  Body: { studentId }
const verifyRequest = async ({ id, studentId }, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const { data } = await axios.post(
    `${base}/${id}/verify`,
    { studentId },
    config
  );
  // { queued: false|true, action: "verify", requestId, studentId? }
  return data;
};

// POST /api/verification-request/:id/reject  Body: { reason }
const rejectRequest = async ({ id, reason }, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const { data } = await axios.post(
    `${base}/${id}/reject`,
    { reason },
    config
  );
  // { queued: true|false, action: "reject", requestId }
  return data;
};

const verifyService = {
  listRequests,
  getRequestById,
  verifyRequest,
  rejectRequest,
};

export default verifyService;
