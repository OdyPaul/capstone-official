// src/features/mobileAccounts/mobileAccountService.js
import axios from "axios";
// 👇 keep this path consistent with your existing accountService
import { API_URL } from "../../../config";
import { getToken } from "../auth/authService";

const headers = () =>  {
  const t = getToken();
  return {
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
  };
};

// List ONLY mobile users (kind=mobile)
const list = async () => {
  const { data } = await axios.get(
    `${API_URL}/api/web/users?kind=mobile`,
    headers()
  );
  // data is an array of users (no password field)
  return data;
};

// Update a mobile user
const update = async (id, payload) => {
  const { data } = await axios.put(
    `${API_URL}/api/web/mobile-users/${id}`,
    payload,
    headers()
  );
  // controller returns { user }
  return data.user;
};

// Delete a mobile user
const remove = async (id) => {
  await axios.delete(`${API_URL}/api/web/mobile-users/${id}`, headers());
  // just return the id so slice can remove from state
  return id;
};

const mobileAccountService = { list, update, remove };
export default mobileAccountService;
