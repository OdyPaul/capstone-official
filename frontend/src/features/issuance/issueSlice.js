import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import issueService from "./issueService";

// 🔹 Issue credentials (batch, queued)
export const issueCredentials = createAsyncThunk(
  "issue/issueCredentials",
  async (arg, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;

      // Backwards-compatible: allow either payload OR { payload, onProgress }
      let payload = arg;
      let onProgress = undefined;

      if (arg && typeof arg === "object" && arg.payload) {
        payload = arg.payload;
        onProgress = arg.onProgress;
      }

      const result = await issueService.issueCredentials(payload, token, {
        onProgress,
      });
      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to issue credentials";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🔹 list issued
export const getIssues = createAsyncThunk(
  "issue/getIssues",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issueService.getIssues(filters, token);
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Failed to load issues";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🔹 delete issued
export const deleteIssue = createAsyncThunk(
  "issue/deleteIssue",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issueService.deleteIssue(id, token);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Failed to delete issuance";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  issues: [],
  issueFilters: {
    range: "1m",
    program: "All",
    type: "All",
    status: "All",
    q: "",
    orderNo: "",
    receiptNo: "",
    unpaidOnly: false,
  },

  isLoadingIssue: false, // issuing batch
  isLoadingList: false, // fetching issued
  isLoadingDelete: false, // deleting
  isSuccess: false,
  isError: false,
  message: "",
  lastResult: null, // last issuance response (for success modal)
};

const issueSlice = createSlice({
  name: "issue",
  initialState,
  reducers: {
    resetIssueState: (state) => {
      const keep = state.issueFilters;
      state.isLoadingIssue = false;
      state.isLoadingList = false;
      state.isLoadingDelete = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
      state.lastResult = null;
      state.issueFilters = keep;
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔹 issue credentials
      .addCase(issueCredentials.pending, (state) => {
        state.isLoadingIssue = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
        state.lastResult = null;
      })
      .addCase(issueCredentials.fulfilled, (state, action) => {
        state.isLoadingIssue = false;
        state.isSuccess = true;
        state.lastResult = action.payload;
      })
      .addCase(issueCredentials.rejected, (state, action) => {
        state.isLoadingIssue = false;
        state.isError = true;
        state.message = action.payload;
      })

      // 🔹 list issues
      .addCase(getIssues.pending, (state) => {
        state.isLoadingList = true;
      })
      .addCase(getIssues.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.isSuccess = true;
        state.issues = action.payload;

        const inArg = action.meta.arg || {};
        const prev = state.issueFilters || {};
        const resolved = {
          range: inArg.range ?? prev.range ?? "1m",
          program: inArg.program ?? prev.program ?? "All",
          type: inArg.type ?? prev.type ?? "All",
          status: inArg.status ?? prev.status ?? "All",
          q: inArg.q ?? prev.q ?? "",
          orderNo: inArg.orderNo ?? prev.orderNo ?? "",
          receiptNo: inArg.receiptNo ?? prev.receiptNo ?? "",
          unpaidOnly: inArg.unpaidOnly ?? prev.unpaidOnly ?? false,
        };
        state.issueFilters = resolved;
        try {
          localStorage.setItem("lastIssueFilters", JSON.stringify(resolved));
        } catch {}
      })
      .addCase(getIssues.rejected, (state, action) => {
        state.isLoadingList = false;
        state.isError = true;
        state.message = action.payload;
      })

      // 🔹 delete
      .addCase(deleteIssue.pending, (state) => {
        state.isLoadingDelete = true;
      })
      .addCase(deleteIssue.fulfilled, (state, action) => {
        state.isLoadingDelete = false;
        state.isSuccess = true;
        state.issues = state.issues.filter(
          (it) => it._id !== action.payload._id
        );
      })
      .addCase(deleteIssue.rejected, (state, action) => {
        state.isLoadingDelete = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetIssueState } = issueSlice.actions;
export default issueSlice.reducer;
