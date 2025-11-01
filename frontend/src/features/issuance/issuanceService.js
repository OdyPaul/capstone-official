import axios from "axios";
import qs from "qs";
import { API_URL } from "../../../config";

// ------- helpers -------
const paramsSer = (p) => qs.stringify(p, { arrayFormat: "repeat" });

// List payments (any status). Server returns populated draft (not student).
const listPayments = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters || {},
    paramsSerializer: paramsSer,
  };
  const { data } = await axios.get(`${API_URL}/api/web/payments`, config);
  return data;
};

// Convenience: only pending payments (for confirmation page)
const listPendingPayments = async (filters, token) => {
  return await listPayments({ ...(filters || {}), status: "pending" }, token);
};

// Issuable == 'paid & not yet consumed' (client-side filter)
const getIssuablePayments = async (filters, token) => {
  const paid = await listPayments({ ...(filters || {}), status: "paid" }, token);
  return Array.isArray(paid) ? paid.filter((p) => !p.consumed_at) : [];
};

// Issue from draft id; anchorNow optional
const issueDraft = async (draftId, { anchorNow = false } = {}, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: { anchorNow },
    paramsSerializer: paramsSer,
  };
  const { data } = await axios.post(
    `${API_URL}/api/web/vc/drafts/${draftId}/issue`,
    {},
    config
  );
  return data; // {message, credential_id} or anchor response
};

// Mark a pending payment as PAID by tx_no (cashier)
const markPaidByTxNo = async (txNo, payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(
    `${API_URL}/api/web/payments/tx/${encodeURIComponent(txNo)}/mark-paid`,
    payload,
    config
  );
  return data;
};

// (Optional) Create/ensure a payment request for a draft
const createPaymentRequest = async (payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(`${API_URL}/api/web/payments`, payload, config);
  return data;
};


const listIssuedVCs = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters || {},
    paramsSerializer: paramsSer,
  };
  const { data } = await axios.get(`${API_URL}/api/web/vc/signed`, config);
  return data;
};

const ensureClaimForVC = async (credId, opts = {}, token) => {
  const payload = { credId, singleActive: true, ...(opts || {}) };
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(`${API_URL}/api/web/claims`, payload, config);
  return data; // { claim_id, token, claim_url, expires_at, reused }
};

const issuanceService = {
  listPayments,
  listPendingPayments,      // ⬅️ NEW
  getIssuablePayments,
  issueDraft,
  markPaidByTxNo,
  createPaymentRequest,
  listIssuedVCs,
  ensureClaimForVC,
};

export default issuanceService;
