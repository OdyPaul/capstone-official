// src/features/student/studentService.js
import axios from 'axios';
import qs from 'qs';
import { API_URL } from '../../../config';

// GET: Passing students (list/table)
const getPassingStudents = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
  };
  const { data } = await axios.get(`${API_URL}/api/web/student/passing`, config);
  return data;
};

// GET: One student (detail)
const getStudentById = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${API_URL}/api/web/student/${id}`, config);
  return data;
};

// GET: TOR
const getStudentTor = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${API_URL}/api/web/student/${id}/tor`, config);
  return data;
};

// POST: Create student
const createStudent = async (payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(`${API_URL}/api/web/students`, payload, config);
  return data?.student ?? data;
};

// 🔎 GET: Programs (for Create Student page)
const searchPrograms = async ({ q, limit = 10 }, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: { q, limit },
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
  };
  const { data } = await axios.get(`${API_URL}/api/web/programs`, config);
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
};
// PATCH: Update student
const updateStudent = async (id, payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.patch(`${API_URL}/api/web/students/${id}`, payload, config);
  return data;
};

const studentService = {
  getPassingStudents,
  getStudentById,
  getStudentTor,
  createStudent,
  searchPrograms,
  updateStudent,
};

export default studentService;
