// src/features/accounts/accountService.js
import axios from 'axios';
// ⬇️ was '../../../config' which is one level too high from this file
import { API_URL } from '../../../config';
import { getToken } from '../auth/authService';

const headers = () => {
  const t = getToken();
  return { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } };
};

// 🔹 list now supports kind = 'web' | 'mobile' | 'all'
const list = async (kind = 'web') => {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  const { data } = await axios.get(`${API_URL}/api/web/users${qs}`, headers());
  return data; // array
};

const create = async (payload) => {
  const { data } = await axios.post(`${API_URL}/api/web/users`, payload, headers());
  return data.user; // controller returns { user }
};

const update = async (id, payload) => {
  // include currentPassword when provided by UI
  const { data } = await axios.put(`${API_URL}/api/web/users/${id}`, payload, headers());
  return data.user; // controller returns { user }
};

export default { list, create, update };
