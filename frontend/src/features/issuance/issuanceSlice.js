import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import issuanceService from "./issuanceService";


const msg = (err) =>
  err?.response?.data?.message ||
  err?.response?.data ||
  err?.message ||
  "Request failed";

// Load paid & unused receipts (issuable)
export const loadIssuable = createAsyncThunk(
  "issuance/loadIssuable",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issuanceService.getIssuablePayments(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// 🔹 NEW: load pending payments (for confirmation page)
export const loadPendingPayments = createAsyncThunk(
  "issuance/loadPendingPayments",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issuanceService.listPendingPayments(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Batch issue selected drafts
export const issueSelected = createAsyncThunk(
  "issuance/issueSelected",
  async ({ draftIds, anchorNow }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const results = [];
      for (const id of draftIds) {
        try {
          const r = await issuanceService.issueDraft(id, { anchorNow }, token);
          results.push({ id, ok: true, data: r });
        } catch (e) {
          results.push({ id, ok: false, error: msg(e) });
        }
      }
      return results;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// Mark a payment as paid (by tx_no) — refresh lists after success
export const markPaymentPaid = createAsyncThunk(
  "issuance/markPaymentPaid",
  async ({ txNo, payload }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const res = await issuanceService.markPaidByTxNo(txNo, payload, token);

      // Refresh what UIs commonly show
      await thunkAPI.dispatch(loadPendingPayments());
      await thunkAPI.dispatch(loadIssuable());        // becomes issuable after paid
      await thunkAPI.dispatch(loadTransactions({}));  // history tab

      return res;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

// History/Transactions
export const loadTransactions = createAsyncThunk(
  "issuance/loadTransactions",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issuanceService.listPayments(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

export const loadIssuedVCs = createAsyncThunk(
  "issuance/loadIssuedVCs",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await issuanceService.listIssuedVCs(filters || {}, token);
    } catch (e) {
      return thunkAPI.rejectWithValue(
        e?.response?.data?.message || e?.message || "Request failed"
      );
    }
  }
);

export const openClaimQrForVC = createAsyncThunk(
  "issuance/openClaimQrForVC",
  async ({ credId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const r = await issuanceService.ensureClaimForVC(credId, {}, token);
      return { credId, ...r }; // { credId, token, claim_url, expires_at, reused }
    } catch (e) {
      return thunkAPI.rejectWithValue(
        e?.response?.data?.message || e?.message || "Request failed"
      );
    }
  }
);


const initialState = {
  issuable: [],          // array of payments (status=paid, unused)
  pending: [],           // 🔹 NEW — pending payments for confirmation page
  selected: [],          // selected draft ids
  transactions: [],

  isLoadingIssuable: false,
  isLoadingPending: false,  // 🔹 NEW
  isMarkingPaid: false,     // 🔹 NEW
  isIssuing: false,
  isLoadingTx: false,
  lastIssueResults: null,
  issuedVCs: [],
  isLoadingIssued: false,
  claimModal: { open: false, credId: null, claim_id: null, claim_url: null, token: null, expires_at: null, reused: false, error: null },

  isError: false,
  message: "",
};

const issuanceSlice = createSlice({
  name: "issuance",
  initialState,
  reducers: {
    resetIssuance: (s) => {
      s.isLoadingIssuable = false;
      s.isLoadingPending = false;
      s.isMarkingPaid = false;
      s.isIssuing = false;
      s.isLoadingTx = false;
      s.isError = false;
      s.message = "";
      s.lastIssueResults = null;
    },
    setSelected: (s, a) => {
      s.selected = a.payload || [];
    },
    toggleSelect: (s, a) => {
      const id = a.payload;
      s.selected = s.selected.includes(id)
        ? s.selected.filter((x) => x !== id)
        : [...s.selected, id];
    },
    clearSelected: (s) => {
      s.selected = [];
    },
        closeClaimModal: (s) => {
      s.claimModal = { open: false, credId: null, claim_url: null, token: null, expires_at: null, reused: false, error: null };
    },
  },
  extraReducers: (b) => {
    b
      // issuable
      .addCase(loadIssuable.pending, (s) => {
        s.isLoadingIssuable = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadIssuable.fulfilled, (s, a) => {
        s.isLoadingIssuable = false;
        s.issuable = a.payload || [];
      })
      .addCase(loadIssuable.rejected, (s, a) => {
        s.isLoadingIssuable = false;
        s.isError = true;
        s.message = a.payload;
      })

      // 🔹 pending payments
      .addCase(loadPendingPayments.pending, (s) => {
        s.isLoadingPending = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadPendingPayments.fulfilled, (s, a) => {
        s.isLoadingPending = false;
        s.pending = a.payload || [];
      })
      .addCase(loadPendingPayments.rejected, (s, a) => {
        s.isLoadingPending = false;
        s.isError = true;
        s.message = a.payload;
      })

      // issue batch
      .addCase(issueSelected.pending, (s) => {
        s.isIssuing = true;
        s.lastIssueResults = null;
        s.isError = false;
        s.message = "";
      })
      .addCase(issueSelected.fulfilled, (s, a) => {
        s.isIssuing = false;
        s.lastIssueResults = a.payload || [];
        const okIds = new Set((a.payload || []).filter((r) => r.ok).map((r) => r.id));
        s.issuable = s.issuable.filter((p) => !okIds.has(p?.draft?._id));
        s.selected = [];
      })
      .addCase(issueSelected.rejected, (s, a) => {
        s.isIssuing = false;
        s.isError = true;
        s.message = a.payload;
      })

      // history
      .addCase(loadTransactions.pending, (s) => {
        s.isLoadingTx = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(loadTransactions.fulfilled, (s, a) => {
        s.isLoadingTx = false;
        s.transactions = a.payload || [];
      })
      .addCase(loadTransactions.rejected, (s, a) => {
        s.isLoadingTx = false;
        s.isError = true;
        s.message = a.payload;
      })

      // mark paid
      .addCase(markPaymentPaid.pending, (s) => {
        s.isMarkingPaid = true;
      })
      .addCase(markPaymentPaid.fulfilled, (s) => {
        s.isMarkingPaid = false;
      })
      .addCase(markPaymentPaid.rejected, (s, a) => {
        s.isMarkingPaid = false;
        s.isError = true;
        s.message = a.payload;
      })
       .addCase(loadIssuedVCs.pending, (s) => {
        s.isLoadingIssued = true;
      })
      .addCase(loadIssuedVCs.fulfilled, (s, a) => {
        s.isLoadingIssued = false;
        s.issuedVCs = a.payload || [];
      })
      .addCase(loadIssuedVCs.rejected, (s, a) => {
        s.isLoadingIssued = false;
      })
      .addCase(openClaimQrForVC.pending, (s) => {
        s.claimModal = { open: true, credId: null, claim_url: null, token: null, expires_at: null, reused: false, error: null };
      })
      .addCase(openClaimQrForVC.fulfilled, (s, a) => {
        const r = a.payload || {};
        s.claimModal = { open: true, credId: r.credId, claim_id: r.claim_id, claim_url: r.claim_url, token: r.token, expires_at: r.expires_at, reused: !!r.reused, error: null };
      })
      .addCase(openClaimQrForVC.rejected, (s, a) => {
        s.claimModal = { open: true, credId: null, claim_url: null, token: null, expires_at: null, reused: false, error: a.payload || "Failed to open QR" };
      });
  },
});

export const { resetIssuance, setSelected, toggleSelect, clearSelected,closeClaimModal, } =
  issuanceSlice.actions;

export default issuanceSlice.reducer;
