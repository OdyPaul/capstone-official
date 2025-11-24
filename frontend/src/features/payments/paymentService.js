// src/features/payments/paymentService.js
import axios from "axios";
import { API_URL } from "../../../config";

const BASE_URL = `${API_URL}/api/web/issuance/issue`;

// helper to attach Authorization header
const authConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

/**
 * Load issued + unpaid issues.
 * Back-end: GET /api/web/issuance/issue?unpaidOnly=true&...
 */
const getUnpaidPayments = async (filters = {}, token) => {
  const params = {
    unpaidOnly: true, // server enforces receipt_no=null + status=issued when true
    ...filters,
  };

  const res = await axios.get(BASE_URL, {
    ...authConfig(token),
    params,
  });

  return res.data;
};

/**
 * Confirm payment → calls backend payAndSign:
 *   POST /api/web/issuance/issue/:id/pay
 * We auto-generate a receipt_no here so cashier just clicks "Confirm".
 */
const confirmPayment = async ({ issueId, amount, anchorNow }, token) => {
  const url = `${BASE_URL}/${issueId}/pay`;

  // build a deterministic-ish receipt number: RCPT-YYYYMMDD-XXXXXX
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const rcpt = `RCPT-${ymd.replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const body = {
    receipt_no: rcpt,
    receipt_date: ymd, // controller will turn this into Date
    amount: Number(amount) || 250,
    anchorNow: !!anchorNow,
  };

  const res = await axios.post(url, body, authConfig(token));
  return res.data;
};

const paymentService = {
  getUnpaidPayments,
  confirmPayment,
};

export default paymentService;
