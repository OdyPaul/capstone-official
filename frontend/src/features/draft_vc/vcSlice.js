// src/features/draft_vc/vcSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import vcService from "./vcService";

// 🔹 Create multiple VC drafts
export const createDrafts = createAsyncThunk(
  "vc/createDrafts",
  async (drafts, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const created = await vcService.createDrafts(drafts, token);

      // ✅ Immediately refetch populated drafts after creation
      const refreshed = await vcService.getDrafts({}, token);
      return { created, refreshed };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to create VC drafts";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const getDrafts = createAsyncThunk(
  "vc/getDrafts",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await vcService.getDrafts(filters, token);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🔹 Delete a draft
export const deleteDraft = createAsyncThunk(
  "vc/deleteDraft",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await vcService.deleteDraft(id, token);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete VC draft";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  drafts: [],
  isLoadingList: false,    // fetching drafts
  isLoadingCreate: false,  // creating draft(s)
  isLoadingDelete: false,  // deleting
  isSuccess: false,
  isError: false,
  message: "",
};

const vcSlice = createSlice({
  name: "vc",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoadingList = false;
      state.isLoadingCreate = false;
      state.isLoadingDelete = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
      clearDrafts: (state) => {
      state.drafts = [];          // 🚀 empty the table
      state.isLoadingList = false;
      state.isLoadingCreate = false;
      state.isLoadingDelete = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    }
  },
  extraReducers: (builder) => {
    builder
      // 🔹 Create drafts
      .addCase(createDrafts.pending, (state) => {
        state.isLoadingCreate = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(createDrafts.fulfilled, (state, action) => {
        state.isLoadingCreate = false;
        state.isSuccess = true;

        // ✅ Use refreshed list (already populated)
        state.drafts = action.payload.refreshed;
      })
      .addCase(createDrafts.rejected, (state, action) => {
        state.isLoadingCreate = false;
        state.isError = true;
        state.message = action.payload;
      })

      // 🔹 Get drafts
      .addCase(getDrafts.pending, (state) => {
        state.isLoadingList = true;
      })
      .addCase(getDrafts.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.isSuccess = true;
        state.drafts = action.payload;

          // save filters for auto-reload
      const filters = action.meta.arg || {};
      localStorage.setItem("lastDraftFilters", JSON.stringify(filters));
      })
      .addCase(getDrafts.rejected, (state, action) => {
        state.isLoadingList = false;
        state.isError = true;
        state.message = action.payload;
      })

      // 🔹 Delete draft
      .addCase(deleteDraft.pending, (state) => {
        state.isLoadingDelete = true;
      })
      .addCase(deleteDraft.fulfilled, (state, action) => {
        state.isLoadingDelete = false;
        state.isSuccess = true;
        state.drafts = state.drafts.filter((d) => d._id !== action.payload._id);
      })
      .addCase(deleteDraft.rejected, (state, action) => {
        state.isLoadingDelete = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset ,clearDrafts } = vcSlice.actions;
export default vcSlice.reducer;
