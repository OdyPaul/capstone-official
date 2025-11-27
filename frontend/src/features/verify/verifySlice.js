// src/features/verify/verifySlice.js
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import verifyService from "./verifyService";

const initialState = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  status: "unverified", // UI-level filter: "unverified" | "verified" | "rejected" | "all"
  q: "",

  current: null,

  isLoadingList: false,
  isLoadingCurrent: false,
  isActing: false,

  isError: false,
  message: "",
};

const selectToken = (state) => state?.auth?.user?.token;

const apiStatusFromUi = (ui) => (ui === "unverified" ? "pending" : ui);

/* ========================= THUNKS ========================= */

/**
 * List verification requests (admin, paginated)
 * payload: { page, limit, status, q }
 */
export const fetchVerifyList = createAsyncThunk(
  "verify/fetchList",
  async (params, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = selectToken(state);
      if (!token) throw new Error("Not authenticated");

      const {
        page = 1,
        limit = 20,
        status = "unverified",
        q = "",
      } = params || {};

      const apiStatus =
        status === "all" ? "all" : apiStatusFromUi(status || "unverified");

      const query = {
        page,
        limit,
        ...(q ? { q } : {}),
        ...(apiStatus ? { status: apiStatus } : {}),
      };

      const data = await verifyService.listRequests(query, token);
      // data: { items, total, page: apiPage, limit: apiLimit }

      return {
        ...data,
        page,
        limit,
        status,
        q,
      };
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch verification requests";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Get one verification request (admin)
 */
export const fetchVerifyById = createAsyncThunk(
  "verify/fetchById",
  async (id, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = selectToken(state);
      if (!token) throw new Error("Not authenticated");

      const data = await verifyService.getRequestById(id, token);
      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch verification request";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Queue / perform verification for a request
 * payload: { id, studentId }
 */
export const verifyVerifyRequest = createAsyncThunk(
  "verify/verifyRequest",
  async ({ id, studentId }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = selectToken(state);
      if (!token) throw new Error("Not authenticated");

      const data = await verifyService.verifyRequest({ id, studentId }, token);
      // data: { queued, action: 'verify', requestId, studentId? }
      return { api: data, id, studentId };
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to queue verification";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/**
 * Queue rejection for a request
 * payload: { id, reason }
 */
export const rejectVerifyRequest = createAsyncThunk(
  "verify/rejectRequest",
  async ({ id, reason }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = selectToken(state);
      if (!token) throw new Error("Not authenticated");

      const data = await verifyService.rejectRequest({ id, reason }, token);
      // data: { queued, action: 'reject', requestId }
      return { api: data, id, reason };
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to queue rejection";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

/* ========================= SLICE ========================= */

const verifySlice = createSlice({
  name: "verify",
  initialState,
  reducers: {
    resetVerifyState: () => ({ ...initialState }),
    clearVerifyError: (state) => {
      state.isError = false;
      state.message = "";
    },
    // optional: keep UI filters in Redux if you want
    setVerifyFilters: (state, action) => {
      const { q, status, page, limit } = action.payload || {};
      if (typeof q === "string") state.q = q;
      if (status) state.status = status;
      if (Number.isFinite(page)) state.page = page;
      if (Number.isFinite(limit)) state.limit = limit;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---------- LIST ---------- */
      .addCase(fetchVerifyList.pending, (state) => {
        state.isLoadingList = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(fetchVerifyList.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.items = Array.isArray(action.payload.items)
          ? action.payload.items
          : [];
        state.total = Number.isFinite(action.payload.total)
          ? action.payload.total
          : 0;

        state.page = action.payload.page ?? state.page;
        state.limit = action.payload.limit ?? state.limit;
        state.status = action.payload.status ?? state.status;
        state.q = action.payload.q ?? state.q;
      })
      .addCase(fetchVerifyList.rejected, (state, action) => {
        state.isLoadingList = false;
        state.items = [];
        state.total = 0;
        state.isError = true;
        state.message =
          action.payload || "Failed to fetch verification requests";
      })

      /* ---------- SINGLE ---------- */
      .addCase(fetchVerifyById.pending, (state) => {
        state.isLoadingCurrent = true;
        state.isError = false;
        state.message = "";
        state.current = null;
      })
      .addCase(fetchVerifyById.fulfilled, (state, action) => {
        state.isLoadingCurrent = false;
        state.current = action.payload || null;
      })
      .addCase(fetchVerifyById.rejected, (state, action) => {
        state.isLoadingCurrent = false;
        state.current = null;
        state.isError = true;
        state.message =
          action.payload || "Failed to fetch verification request";
      })

      /* ---------- VERIFY ---------- */
      .addCase(verifyVerifyRequest.pending, (state) => {
        state.isActing = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(verifyVerifyRequest.fulfilled, (state, action) => {
        state.isActing = false;
        state.isError = false;

        const queued = !!action.payload?.api?.queued;
        state.message = queued
          ? "Verification queued."
          : "Verification completed.";

        const id = action.payload?.id;
        if (!id) return;

        // Optimistically mark as verified locally
        if (state.current && String(state.current._id) === String(id)) {
          state.current = { ...state.current, status: "verified" };
        }
        state.items = (state.items || []).map((r) =>
          String(r._id) === String(id) ? { ...r, status: "verified" } : r
        );
      })
      .addCase(verifyVerifyRequest.rejected, (state, action) => {
        state.isActing = false;
        state.isError = true;
        state.message = action.payload || "Failed to queue verification";
      })

      /* ---------- REJECT ---------- */
      .addCase(rejectVerifyRequest.pending, (state) => {
        state.isActing = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(rejectVerifyRequest.fulfilled, (state, action) => {
        state.isActing = false;
        state.isError = false;

        const queued = !!action.payload?.api?.queued;
        state.message = queued
          ? "Rejection queued."
          : "Rejection completed.";

        const id = action.payload?.id;
        if (!id) return;

        // Optimistically mark as rejected locally
        if (state.current && String(state.current._id) === String(id)) {
          state.current = { ...state.current, status: "rejected" };
        }
        state.items = (state.items || []).map((r) =>
          String(r._id) === String(id) ? { ...r, status: "rejected" } : r
        );
      })
      .addCase(rejectVerifyRequest.rejected, (state, action) => {
        state.isActing = false;
        state.isError = true;
        state.message = action.payload || "Failed to queue rejection";
      });
  },
});

export const { resetVerifyState, clearVerifyError, setVerifyFilters } =
  verifySlice.actions;

export default verifySlice.reducer;

/* ========================= SELECTORS ========================= */

export const selectVerifyList = (s) => s?.verify?.items || [];
export const selectVerifyTotal = (s) => s?.verify?.total || 0;

export const selectVerifyListLoading = (s) =>
  !!s?.verify?.isLoadingList;

// MEMOIZED to avoid React-Redux warning
export const selectVerifyError = createSelector(
  (s) => !!s?.verify?.isError,
  (s) => s?.verify?.message || "",
  (isError, message) => ({ isError, message })
);

export const selectVerifyCurrent = (s) => s?.verify?.current;
export const selectVerifyCurrentLoading = (s) =>
  !!s?.verify?.isLoadingCurrent;

export const selectVerifyActing = (s) => !!s?.verify?.isActing;

// Also memoize filters (if you ever use them in useSelector)
export const selectVerifyFilters = createSelector(
  (s) => s?.verify?.q || "",
  (s) => s?.verify?.status || "unverified",
  (s) => s?.verify?.page || 1,
  (s) => s?.verify?.limit || 20,
  (q, status, page, limit) => ({ q, status, page, limit })
);
