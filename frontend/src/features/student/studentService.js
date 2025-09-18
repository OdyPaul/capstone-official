// src/features/student/studentService.js
import axios from 'axios'

const API_URL = '/api/student/' // base URL

// Get students who are passing
const getPassingStudents = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  const response = await axios.get(`${API_URL}passing`, config)
  return response.data
}

// Get full student info (by ID)
const getStudentById = async (id, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  const response = await axios.get(`${API_URL}${id}`, config)
  return response.data
}

// Get student TOR (by ID)
const getStudentTor = async (id, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  const response = await axios.get(`${API_URL}${id}/tor`, config)
  return response.data
}

// Search students (by query)
const searchStudents = async (query, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  const response = await axios.get(`${API_URL}search?q=${query}`, config)
  return response.data
}

const studentService = {
  getPassingStudents,
  getStudentById,
  getStudentTor,
  searchStudents
}

export default studentService
