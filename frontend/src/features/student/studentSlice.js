// features/student/studentSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import studentService from './studentService'

const initialState = {
  students: [],       // filtered/current list
  allPrograms: [],    // unique programs for dropdown
  student: null,      // single student detail
  tor: [],            // transcript of records
  isLoadingList: false,   // 🔹 for table (getPassingStudents)
  isLoadingDetail: false, // 🔹 for modal/details
  isLoadingTor: false,    // 🔹 for transcript
  isSuccess: false,
  isError: false,
  message: ''
}

// 🔹 Get passing students (for table)
export const getPassingStudents = createAsyncThunk(
  "student/getPassingStudents",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getPassingStudents(filters, token)
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.error || err.message
      )
    }
  }
)

// 🔹 Get transcript of records
export const getStudentTor = createAsyncThunk(
  'student/getTor',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getStudentTor(id, token)
    } catch (error) {
      const message =
        (error.response?.data?.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// 🔹 Get one student by ID (for modal)
export const getStudentById = createAsyncThunk(
  'student/getOne',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await studentService.getStudentById(id, token)
    } catch (error) {
      const message =
        (error.response?.data?.message) ||
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
    reset: (state) => {
      state.students = []
      state.allPrograms = []
      state.student = null
      state.tor = []
      state.isLoadingList = false
      state.isLoadingDetail = false
      state.isLoadingTor = false
      state.isSuccess = false
      state.isError = false
      state.message = ''
    }
  },
  extraReducers: (builder) => {
    builder
      // Get Passing Students (table)
      .addCase(getPassingStudents.pending, (state) => {
        state.isLoadingList = true
      })
      .addCase(getPassingStudents.fulfilled, (state, action) => {
        state.isLoadingList = false
        state.isSuccess = true
        state.students = Array.isArray(action.payload) ? action.payload : []

        const newPrograms = (action.payload || []).map((s) => s.program)
        state.allPrograms = [
          ...new Set([...state.allPrograms, ...newPrograms])
        ]
        const filters = action.meta.arg 
        localStorage.setItem("lastStudentFilters", JSON.stringify(filters || {}))
      })
      .addCase(getPassingStudents.rejected, (state, action) => {
        state.isLoadingList = false
        state.isError = true
        state.message = action.payload
      })

      // Get Student TOR
      .addCase(getStudentTor.pending, (state) => {
        state.isLoadingTor = true
      })
      .addCase(getStudentTor.fulfilled, (state, action) => {
        state.isLoadingTor = false
        state.isSuccess = true
        state.tor = action.payload
      })
      .addCase(getStudentTor.rejected, (state, action) => {
        state.isLoadingTor = false
        state.isError = true
        state.message = action.payload
      })

      // Get Student by ID (modal)
      .addCase(getStudentById.pending, (state) => {
        state.isLoadingDetail = true
      })
      .addCase(getStudentById.fulfilled, (state, action) => {
        state.isLoadingDetail = false
        state.isSuccess = true
        state.student = action.payload
      })
      .addCase(getStudentById.rejected, (state, action) => {
        state.isLoadingDetail = false
        state.isError = true
        state.message = action.payload
      })
  }
})

export const { reset } = studentSlice.actions
export default studentSlice.reducer
