// src/features/student/studentService.js
import axios from 'axios'
import qs from 'qs'   // ✅ add this
import { API_URL } from '../../../config'

const getPassingStudents = async (filters, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: filters, // send all filters directly
    paramsSerializer: (params) =>
      qs.stringify(params, { arrayFormat: "repeat" }),
  }

  const response = await axios.get(`${API_URL}/api/student/passing`, config)
  return response.data
}

const getStudentById = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } }
  const response = await axios.get(`${API_URL}/api/student/${id}`, config)
  return response.data
}

const getStudentTor = async (id, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } }
  const response = await axios.get(`${API_URL}/api/student/${id}/tor`, config)
  return response.data
}

const studentService = {
  getPassingStudents,
  getStudentById,
  getStudentTor,
}

export default studentService
