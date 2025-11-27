// src/features/student/studentSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import studentService from './studentService';

const initialState = {
  // List from Student_Data (passing students)
  students: [],
  allPrograms: [],
  student: null, // detail
  tor: [],       // array of grade rows

  // Loading flags
  isLoadingList: false,
  isLoadingDetail: false,
  isLoadingTor: false,

  // Create flags
  isCreating: false,
  createdStudent: null,

  // Update flags
  isUpdating: false,

  // 🔎 Program search
  programResults: [],
  isSearchingPrograms: false,
  programSearchError: '',

  // Generic flags
  isSuccess: false,
  isError: false,
  message: '',

  //student
    searchResults: [],
};

// ---------- Thunks ----------

// Create student
export const createStudent = createAsyncThunk(
  'student/create',
  async (payload, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.createStudent(payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.response?.data?.error || err.message
      );
    }
  }
);

// Update Student_Data
export const updateStudent = createAsyncThunk(
  'student/update',
  async ({ id, data }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.updateStudent(id, data, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.response?.data?.error || err.message
      );
    }
  }
);
//search student:
export const searchStudents = createAsyncThunk(
  "student/searchStudents",
  async (filters = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user?.token;
      return await studentService.searchStudents(filters, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          (error.response.data.message || error.response.data.error)) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);
// Passing students
export const getPassingStudents = createAsyncThunk(
  'student/getPassingStudents',
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.getPassingStudents(filters, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data?.error || err.message);
    }
  }
);

// TOR (grades)
export const getStudentTor = createAsyncThunk(
  'student/getTor',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.getStudentTor(id, token);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || String(error);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// One student
export const getStudentById = createAsyncThunk(
  'student/getOne',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.getStudentById(id, token);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || String(error);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🔎 Programs
export const searchPrograms = createAsyncThunk(
  'student/searchPrograms',
  async ({ q, limit = 12 }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await studentService.searchPrograms({ q, limit }, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.response?.data?.error || err.message
      );
    }
  }
);

export const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    reset: (state) => {
      state.students = [];
      state.allPrograms = [];
      state.student = null;
      state.tor = [];

      state.isLoadingList = false;
      state.isLoadingDetail = false;
      state.isLoadingTor = false;

      state.isCreating = false;
      state.createdStudent = null;

      state.programResults = [];
      state.isSearchingPrograms = false;
      state.programSearchError = '';

      state.isUpdating = false;

      state.isSuccess = false;
      state.isError = false;
      state.message = '';

      
    },
      clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------- Create ----------
      .addCase(createStudent.pending, (state) => {
        state.isCreating = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.isCreating = false;
        state.isSuccess = true;
        state.createdStudent = action.payload || null;
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.isCreating = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ---------- Update ----------
      .addCase(updateStudent.pending, (state) => {
        state.isUpdating = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.isSuccess = true;
        const updated = action.payload;

        if (state.student && state.student._id === updated._id) {
          state.student = { ...state.student, ...updated };
        }

        state.students = (state.students || []).map((s) =>
          s._id === updated._id ? { ...s, ...updated } : s
        );

        if (updated?.program) {
          state.allPrograms = Array.from(
            new Set([...(state.allPrograms || []), updated.program])
          );
        }
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.isUpdating = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ---------- Get Passing Students ----------
      .addCase(getPassingStudents.pending, (state) => {
        state.isLoadingList = true;
      })
      .addCase(getPassingStudents.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.isSuccess = true;
        state.students = Array.isArray(action.payload) ? action.payload : [];

        const newPrograms = (action.payload || [])
          .map((s) => s.program)
          .filter(Boolean);
        state.allPrograms = Array.from(
          new Set([...(state.allPrograms || []), ...newPrograms])
        );

        const filters = action.meta.arg;
        try {
          localStorage.setItem('lastStudentFilters', JSON.stringify(filters || {}));
        } catch {
          // ignore
        }
      })
      .addCase(getPassingStudents.rejected, (state, action) => {
        state.isLoadingList = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ---------- TOR ----------
      .addCase(getStudentTor.pending, (state) => {
        state.isLoadingTor = true;
      })
      .addCase(getStudentTor.fulfilled, (state, action) => {
        state.isLoadingTor = false;
        state.isSuccess = true;
        state.tor = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getStudentTor.rejected, (state, action) => {
        state.isLoadingTor = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ---------- Get One ----------
      .addCase(getStudentById.pending, (state) => {
        state.isLoadingDetail = true;
      })
      .addCase(getStudentById.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.isSuccess = true;
        state.student = action.payload;
      })
      .addCase(getStudentById.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ---------- Program search ----------
      .addCase(searchPrograms.pending, (state) => {
        state.isSearchingPrograms = true;
        state.programSearchError = '';
      })
      .addCase(searchPrograms.fulfilled, (state, action) => {
        state.isSearchingPrograms = false;
        state.programResults = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(searchPrograms.rejected, (state, action) => {
        state.isSearchingPrograms = false;
        state.programResults = [];
        state.programSearchError =
          action.payload || 'Failed to search programs';
      })
        //search student
        .addCase(searchStudents.pending, (state) => {
        state.isSearching = true;
        state.searchError = null;
      })
      .addCase(searchStudents.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload || [];
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.isSearching = false;
        state.searchResults = [];
        state.searchError =
          action.payload ||
          action.error?.message ||
          "Failed to search students";
      });
  },
});

export const { reset,clearSearchResults  } = studentSlice.actions;
export default studentSlice.reducer;
