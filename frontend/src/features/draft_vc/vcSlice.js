// src/features/draft_vc/vcSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import vcService from "./vcService";

// Async thunk for creating VC drafts
export const createDrafts = createAsyncThunk(
  "vc/createDrafts",
  async (drafts, thunkAPI) => {
    try {
      return await vcService.createDrafts(drafts);
    } catch (err) {
      const message =
        (err.response && err.response.data && err.response.data.message) ||
        err.message ||
        "Failed to create VC drafts";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const getDrafts = createAsyncThunk(
  "vc/getDrafts",
  async (_, thunkAPI) => {
    try {
      return await vcService.getDrafts();
    } catch (err) {
      const message =
        (err.response && err.response.data && err.response.data.message) ||
        err.message ||
        "Failed to fetch VC drafts";
      return thunkAPI.rejectWithValue(message);
    }
  }
);
const initialState = {
  drafts: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

const vcSlice = createSlice({
  name: "vc",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDrafts.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(createDrafts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.drafts = action.payload; // saved VCs
      })
      .addCase(createDrafts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
       .addCase(getDrafts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDrafts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.drafts = action.payload;
      })
      .addCase(getDrafts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = vcSlice.actions;
export default vcSlice.reducer;
