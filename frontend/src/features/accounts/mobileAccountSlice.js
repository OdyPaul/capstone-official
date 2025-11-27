// src/features/mobileAccounts/mobileAccountSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import mobileAccountService from "./mobileAccountService";

const initialState = {
  items: [],
  isLoading: false,
  isError: false,
  message: "",
};

export const fetchMobileAccounts = createAsyncThunk(
  "mobileAccounts/list",
  async (_, thunkAPI) => {
    try {
      return await mobileAccountService.list();
    } catch (e) {
      const m =
        e.response?.data?.message || e.message || "Failed to load mobile accounts";
      return thunkAPI.rejectWithValue(m);
    }
  }
);

export const updateMobileAccount = createAsyncThunk(
  "mobileAccounts/update",
  async ({ id, data }, thunkAPI) => {
    try {
      const updated = await mobileAccountService.update(id, data);
      return updated;
    } catch (e) {
      const m =
        e.response?.data?.message ||
        e.message ||
        "Failed to update mobile account";
      return thunkAPI.rejectWithValue(m);
    }
  }
);

export const deleteMobileAccount = createAsyncThunk(
  "mobileAccounts/delete",
  async (id, thunkAPI) => {
    try {
      const removedId = await mobileAccountService.remove(id);
      return removedId;
    } catch (e) {
      const m =
        e.response?.data?.message ||
        e.message ||
        "Failed to delete mobile account";
      return thunkAPI.rejectWithValue(m);
    }
  }
);

const mobileAccountSlice = createSlice({
  name: "mobileAccounts",
  initialState,
  reducers: {
    resetMobileAccounts: (s) => {
      s.isLoading = false;
      s.isError = false;
      s.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchMobileAccounts.pending, (s) => {
        s.isLoading = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(fetchMobileAccounts.fulfilled, (s, action) => {
        s.isLoading = false;
        s.items = action.payload || [];
      })
      .addCase(fetchMobileAccounts.rejected, (s, action) => {
        s.isLoading = false;
        s.isError = true;
        s.message = action.payload;
      })

      // update
      .addCase(updateMobileAccount.pending, (s) => {
        s.isLoading = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(updateMobileAccount.fulfilled, (s, action) => {
        s.isLoading = false;
        const u = action.payload;
        if (!u?._id) return;
        s.items = (s.items || []).map((it) =>
          it._id === u._id ? { ...it, ...u } : it
        );
      })
      .addCase(updateMobileAccount.rejected, (s, action) => {
        s.isLoading = false;
        s.isError = true;
        s.message = action.payload;
      })

      // delete
      .addCase(deleteMobileAccount.pending, (s) => {
        s.isLoading = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(deleteMobileAccount.fulfilled, (s, action) => {
        s.isLoading = false;
        const id = action.payload;
        s.items = (s.items || []).filter((it) => it._id !== id);
      })
      .addCase(deleteMobileAccount.rejected, (s, action) => {
        s.isLoading = false;
        s.isError = true;
        s.message = action.payload;
      });
  },
});

export const { resetMobileAccounts } = mobileAccountSlice.actions;
export default mobileAccountSlice.reducer;
