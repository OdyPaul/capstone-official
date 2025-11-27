// src/features/student/studentService.js
import axios from 'axios';
import qs from 'qs';
import { API_URL } from '../../../config';

const webBase = `${API_URL}/api/web`;

/**
 * GET: Passing students from Student_Data
 * Backend: GET /api/web/students/passing
 */
const getPassingStudents = async (filters = {}, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,
    paramsSerializer: (params) =>
      qs.stringify(params, { arrayFormat: 'repeat' }),
  };

  const { data } = await axios.get(`${webBase}/students/passing`, config);
  return Array.isArray(data) ? data : [];
};

/**
 * GET: One student (Student_Data detail)
 * Backend: GET /api/web/students/:id
 */
const getStudentById = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${webBase}/students/${id}`, config);
  return data;
};

/**
 * GET: TOR / Grades for a student
 * Backend: GET /api/web/students/:id/tor
 */
const getStudentTor = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${webBase}/students/${id}/tor`, config);
  return Array.isArray(data) ? data : [];
};

/**
 * POST: Create student in Student_Data
 * Backend: POST /api/web/students
 */
const createStudent = async (payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(`${webBase}/students`, payload, config);
  return data?.student ?? data;
};

/**
 * 🔎 GET: Search programs from Curriculum collection
 * Backend: GET /api/web/programs?q=&limit=
 */
const searchPrograms = async ({ q, limit = 10 }, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: { q, limit },
    paramsSerializer: (p) =>
      qs.stringify(p, { arrayFormat: 'repeat' }),
  };

  const { data } = await axios.get(`${webBase}/programs`, config);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

/**
 * PATCH: Update Student_Data (partial)
 * Backend: PATCH /api/web/students/:id
 */
const updateStudent = async (id, payload, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.patch(`${webBase}/students/${id}`, payload, config);
  return data;
};


//search student
const searchStudents = async (filters = {}, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters,
    paramsSerializer: (params) =>
      qs.stringify(params, { arrayFormat: "repeat" }),
  };

  const { data } = await axios.get(`${webBase}/students/search`, config);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const studentService = {
  getPassingStudents,
  getStudentById,
  getStudentTor,
  createStudent,
  searchPrograms,
  updateStudent,
  searchStudents
};

export default studentService;
