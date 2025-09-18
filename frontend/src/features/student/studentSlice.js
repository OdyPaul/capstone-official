// src/features/student/studentSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import studentService from './studentService'

const initialState = {
  students: [],
  student: null,
  tor: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
}

// Thunks

// Get all passing students
export const getPassingStudents = createAsyncThunk(
  'student/getPassing',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getPassingStudents(token)
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// Get student TOR
export const getStudentTor = createAsyncThunk(
  'student/getTor',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getStudentTor(id, token)
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// Find student by ID
export const getStudentById = createAsyncThunk(
  'student/getOne',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getStudentById(id, token)
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// Search students
export const searchStudents = createAsyncThunk(
  'student/search',
  async (query, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.searchStudents(query, token)
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

export const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    reset: (state) => initialState
  },
  extraReducers: (builder) => {
    builder
      // Get Passing Students
      .addCase(getPassingStudents.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getPassingStudents.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.students = action.payload
      })
      .addCase(getPassingStudents.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
      })

      // Get Student TOR
      .addCase(getStudentTor.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getStudentTor.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.tor = action.payload
      })
      .addCase(getStudentTor.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
      })

      // Get Student by ID
      .addCase(getStudentById.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getStudentById.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.student = action.payload
      })
      .addCase(getStudentById.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
      })

      // Search Students
      .addCase(searchStudents.pending, (state) => {
        state.isLoading = true
      })
      .addCase(searchStudents.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.students = action.payload
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
      })
  }
})

export const { reset } = studentSlice.actions
export default studentSlice.reducer
