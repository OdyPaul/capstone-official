import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import anchorService from "./anchorService";

const msg = (err) =>
  err?.response?.data?.message ||
  err?.response?.data ||
  err?.message ||
  "Request failed";

// -------------------- THUNKS --------------------

// Queue: load (mode: 'now' | 'batch' | 'all', approved: 'all' | 'true' | 'false')
export const loadAnchorQueue = createAsyncThunk(
  "anchor/loadQueue",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      return await anchorService.listQueue(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Queue: request "NOW" (queue-only — does NOT mint immediately)
export const enqueueAnchorNow = createAsyncThunk(
  "anchor/enqueueNow",
  async ({ credId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      const res = await anchorService.requestNow(credId, token);
      await thunkAPI.dispatch(
        loadAnchorQueue({ mode: "now", approved: "all" })
      );
      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Approve queued (approved_mode: 'single' | 'batch')
export const approveQueued = createAsyncThunk(
  "anchor/approveQueued",
  async ({ credIds, approved_mode }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      const res = await anchorService.approveQueued(
        { credIds, approved_mode },
        token
      );
      await thunkAPI.dispatch(
        loadAnchorQueue({ mode: "all", approved: "all" })
      );
      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Run a single (one leaf) — requires approved_mode === 'single'
export const runSingleAnchor = createAsyncThunk(
  "anchor/runSingle",
  async ({ credId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      const res = await anchorService.runSingle(credId, token);
      await thunkAPI.dispatch(
        loadAnchorQueue({ mode: "all", approved: "all" })
      );
      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Mint batch (admin/cron/EOD)
export const mintBatch = createAsyncThunk(
  "anchor/mintBatch",
  async ({ mode = "now" } = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      const res = await anchorService.mintBatch(token, { mode });
      await thunkAPI.dispatch(
        loadAnchorQueue({ mode: "now", approved: "all" })
      );
      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// "Non Anchor Now" lists (recent signed VCs not queued for NOW and not anchored)
export const loadRecentNonAnchor = createAsyncThunk(
  "anchor/loadRecentNonAnchor",
  async ({ days = 15, extraFilters = {} } = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      return await anchorService.listRecentNonAnchorSigned(
        { days, extraFilters },
        token
      );
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// ---------- NEW: load anchored batches ----------
export const loadAnchorBatches = createAsyncThunk(
  "anchor/loadBatches",
  async ({ limit = 200, chain_id } = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      return await anchorService.listAnchorBatches(
        { limit, chain_id },
        token
      );
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// ---------- NEW: simple candidates list (unanchored issued VCs) ----------
export const loadAnchorCandidates = createAsyncThunk(
  "anchor/loadCandidates",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      return await anchorService.listCandidates(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// ---------- NEW: mint a selected set of IDs as one batch ----------
export const mintSelectedBatch = createAsyncThunk(
  "anchor/mintSelectedBatch",
  async ({ credIds, filters = {} }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Not authenticated");
      const res = await anchorService.mintSelected({ credIds }, token);
      // Refresh candidates using same filters
      await thunkAPI.dispatch(loadAnchorCandidates(filters));
      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// -------------------- SLICE --------------------
const initialState = {
  // Queue
  queue: [],
  queueToday: [],
  isLoadingQueue: false,

  // Actions
  isRequestingNow: false,
  isApproving: false,
  isRunningSingle: false,
  isMinting: false,

  // Non-Anchor-Now windows
  recent15: [],
  recent30: [],
  isLoadingRecent15: false,
  isLoadingRecent30: false,

  // ---------- NEW: anchored batches ----------
  anchored: [],
  isLoadingAnchored: false,

  // ---------- NEW: anchor candidates (unanchored issued VCs) ----------
  candidates: [],
  isLoadingCandidates: false,

  // Generic status
  isError: false,
  message: "",
  lastAction: null,
};

const anchorSlice = createSlice({
  name: "anchor",
  initialState,
  reducers: {
    resetAnchorState: (s) => {
      s.isLoadingQueue = false;
      s.isRequestingNow = false;
      s.isApproving = false;
      s.isRunningSingle = false;
      s.isMinting = false;
      s.isLoadingRecent15 = false;
      s.isLoadingRecent30 = false;
      s.isLoadingAnchored = false;
      s.isLoadingCandidates = false;
      s.isError = false;
      s.message = "";
      s.lastAction = null;
    },
    recomputeQueueToday: (s) => {
      s.queueToday = anchorService.listQueueTodayFromAll(s.queue);
    },
  },
  extraReducers: (b) => {
    b
      // -------- Queue load --------
      .addCase(loadAnchorQueue.pending, (s) => {
        s.isLoadingQueue = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadAnchorQueue.fulfilled, (s, a) => {
        s.isLoadingQueue = false;
        s.queue = a.payload || [];
        s.queueToday = anchorService.listQueueTodayFromAll(s.queue);
      })
      .addCase(loadAnchorQueue.rejected, (s, a) => {
        s.isLoadingQueue = false;
        s.isError = true;
        s.message = a.payload;
      })

      // -------- Enqueue NOW --------
      .addCase(enqueueAnchorNow.pending, (s) => {
        s.isRequestingNow = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(enqueueAnchorNow.fulfilled, (s, a) => {
        s.isRequestingNow = false;
        s.lastAction = a.payload || null;
      })
      .addCase(enqueueAnchorNow.rejected, (s, a) => {
        s.isRequestingNow = false;
        s.isError = true;
        s.message = a.payload;
      })

      // -------- Approve queued --------
      .addCase(approveQueued.pending, (s) => {
        s.isApproving = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(approveQueued.fulfilled, (s, a) => {
        s.isApproving = false;
        s.lastAction = a.payload || null;
      })
      .addCase(approveQueued.rejected, (s, a) => {
        s.isApproving = false;
        s.isError = true;
        s.message = a.payload;
      })

      // -------- Run single --------
      .addCase(runSingleAnchor.pending, (s) => {
        s.isRunningSingle = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(runSingleAnchor.fulfilled, (s, a) => {
        s.isRunningSingle = false;
        s.lastAction = a.payload || null;
      })
      .addCase(runSingleAnchor.rejected, (s, a) => {
        s.isRunningSingle = false;
        s.isError = true;
        s.message = a.payload;
      })

      // -------- Mint batch --------
      .addCase(mintBatch.pending, (s) => {
        s.isMinting = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(mintBatch.fulfilled, (s, a) => {
        s.isMinting = false;
        s.lastAction = a.payload || null;
      })
      .addCase(mintBatch.rejected, (s, a) => {
        s.isMinting = false;
        s.isError = true;
        s.message = a.payload;
      })

      // -------- Non-Anchor-Now (generic) --------
      .addCase(loadRecentNonAnchor.pending, (s, a) => {
        const days = a.meta?.arg?.days ?? 15;
        if (Number(days) <= 15) s.isLoadingRecent15 = true;
        else s.isLoadingRecent30 = true;
      })
      .addCase(loadRecentNonAnchor.fulfilled, (s, a) => {
        const days = a.meta?.arg?.days ?? 15;
        if (Number(days) <= 15) {
          s.isLoadingRecent15 = false;
          s.recent15 = a.payload || [];
        } else {
          s.isLoadingRecent30 = false;
          s.recent30 = a.payload || [];
        }
      })
      .addCase(loadRecentNonAnchor.rejected, (s, a) => {
        const days = a.meta?.arg?.days ?? 15;
        if (Number(days) <= 15) s.isLoadingRecent15 = false;
        else s.isLoadingRecent30 = false;
        s.isError = true;
        s.message = a.payload;
      })

      // ---------- NEW: anchored batches ----------
      .addCase(loadAnchorBatches.pending, (s) => {
        s.isLoadingAnchored = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadAnchorBatches.fulfilled, (s, a) => {
        s.isLoadingAnchored = false;
        s.anchored = a.payload || [];
      })
      .addCase(loadAnchorBatches.rejected, (s, a) => {
        s.isLoadingAnchored = false;
        s.isError = true;
        s.message = a.payload;
      })

      // ---------- NEW: candidates ----------
      .addCase(loadAnchorCandidates.pending, (s) => {
        s.isLoadingCandidates = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadAnchorCandidates.fulfilled, (s, a) => {
        s.isLoadingCandidates = false;
        s.candidates = a.payload || [];
      })
      .addCase(loadAnchorCandidates.rejected, (s, a) => {
        s.isLoadingCandidates = false;
        s.isError = true;
        s.message = a.payload;
      })

      // ---------- NEW: mintSelectedBatch ----------
      .addCase(mintSelectedBatch.pending, (s) => {
        s.isMinting = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(mintSelectedBatch.fulfilled, (s, a) => {
        s.isMinting = false;
        s.lastAction = a.payload || null;
      })
      .addCase(mintSelectedBatch.rejected, (s, a) => {
        s.isMinting = false;
        s.isError = true;
        s.message = a.payload;
      });
  },
});

export const { resetAnchorState, recomputeQueueToday } = anchorSlice.actions;
export default anchorSlice.reducer;

// -------------------- NULL-SAFE SELECTORS --------------------
export const selectAnchorState = (s) => s?.anchor ?? initialState;
export const selectQueue = (s) => s?.anchor?.queue ?? [];
export const selectQueueToday = (s) => s?.anchor?.queueToday ?? [];
export const selectRecent15 = (s) => s?.anchor?.recent15 ?? [];
export const selectRecent30 = (s) => s?.anchor?.recent30 ?? [];
export const selectAnchored = (s) => s?.anchor?.anchored ?? [];
export const selectIsLoadingAnchored = (s) =>
  s?.anchor?.isLoadingAnchored ?? false;

// NEW
export const selectAnchorCandidates = (s) =>
  s?.anchor?.candidates ?? [];
export const selectIsLoadingCandidates = (s) =>
  s?.anchor?.isLoadingCandidates ?? false;
