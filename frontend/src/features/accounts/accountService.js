// src/features/accounts/accountService.js
import axios from 'axios';
import { API_URL } from '../../../config';
import { getToken } from '../auth/authService';

const headers = () => {
  const t = getToken();
  return { headers: { Authorization: `Bearer ${t}` } };
};

const list = async () => {
  const { data } = await axios.get(`${API_URL}/api/web/users`, headers());
  return data; // array
};

const create = async (payload) => {
  // payload: { username, fullName, age, address, gender, email, password, contactNo, role, profilePicture }
  const { data } = await axios.post(`${API_URL}/api/web/users`, payload, headers());
  return data.user; // controller returns { user }
};

// NEW: update
const update = async (id, payload) => {
  // payload may include: { username, fullName, age, address, gender, email, password?, contactNo, role, profilePicture, profileImageId? }
  const { data } = await axios.put(`${API_URL}/api/web/users/${id}`, payload, headers());
  return data.user; // controller returns { user }
};

export default { list, create, update };
