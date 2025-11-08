// src/features/request/requestsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import requestsService from "./requestsService";

const initialState = {
  items: [],
  isLoading: false,
  isUpdating: false,
  isError: false,
  isSuccess: false,
  message: "",
};

export const getAllRequests = createAsyncThunk(
  "requests/getAll",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      return await requestsService.getAllRequests(filters, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to load"
      );
    }
  }
);

export const reviewRequest = createAsyncThunk(
  "requests/review",
  async ({ id, status }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      return await requestsService.reviewRequest({ id, status }, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to update"
      );
    }
  }
);

// NEW: delete thunk
export const deleteRequest = createAsyncThunk(
  "requests/delete",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      return await requestsService.deleteRequest(id, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to delete"
      );
    }
  }
);

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    resetRequests: (s) => {
      s.items = [];
      s.isLoading = false;
      s.isUpdating = false;
      s.isError = false;
      s.isSuccess = false;
      s.message = "";
    },
  },
  extraReducers: (b) => {
    b
      // Load
      .addCase(getAllRequests.pending, (s) => {
        s.isLoading = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(getAllRequests.fulfilled, (s, a) => {
        s.isLoading = false;
        s.isSuccess = true;
        s.items = Array.isArray(a.payload) ? a.payload : [];
      })
      .addCase(getAllRequests.rejected, (s, a) => {
        s.isLoading = false;
        s.isError = true;
        s.message = a.payload;
      })

      // Review
      .addCase(reviewRequest.pending, (s) => {
        s.isUpdating = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(reviewRequest.fulfilled, (s, a) => {
        s.isUpdating = false;
        s.isSuccess = true;
        const upd = a.payload;
        s.items = (s.items || []).map((r) => (r._id === upd._id ? { ...r, ...upd } : r));
      })
      .addCase(reviewRequest.rejected, (s, a) => {
        s.isUpdating = false;
        s.isError = true;
        s.message = a.payload;
      })

      // Delete
      .addCase(deleteRequest.pending, (s) => {
        s.isUpdating = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(deleteRequest.fulfilled, (s, a) => {
        s.isUpdating = false;
        s.isSuccess = true;
        const removedId = a.payload?._id;
        s.items = (s.items || []).filter((r) => r._id !== removedId);
      })
      .addCase(deleteRequest.rejected, (s, a) => {
        s.isUpdating = false;
        s.isError = true;
        s.message = a.payload;
      });
  },
});

export const { resetRequests } = requestsSlice.actions;
export default requestsSlice.reducer;
