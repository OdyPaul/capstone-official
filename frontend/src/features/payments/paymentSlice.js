// src/features/payments/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import paymentService from "./paymentService";

// same defaults you used in Drafts.jsx for issued + unpaid
const UNPAID_DEFAULTS = {
  range: "1m",
  program: "All",
  type: "All",
  status: "issued",
  q: "",
  orderNo: "",
  receiptNo: "",
  unpaidOnly: true,
};

const initialState = {
  items: [],
  isLoadingList: false,
  isErrorList: false,
  listMessage: "",
  isSavingPayment: false,
  saveError: null,
};

// GET /api/web/issuance/issue?unpaidOnly=true&...
export const fetchUnpaidPayments = createAsyncThunk(
  "payments/fetchUnpaidPayments",
  async (filters = {}, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth?.user?.token || state.auth?.token;

      const merged = { ...UNPAID_DEFAULTS, ...filters };
      const data = await paymentService.getUnpaidPayments(merged, token);
      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load issued & unpaid credentials";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// POST /api/web/issuance/issue/:id/pay
export const confirmPayment = createAsyncThunk(
  "payments/confirmPayment",
  async ({ issueId, amount, anchorNow }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth?.user?.token || state.auth?.token;

      const data = await paymentService.confirmPayment(
        { issueId, amount, anchorNow },
        token
      );
      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to confirm payment";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const paymentSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    resetPaymentError(state) {
      state.isErrorList = false;
      state.listMessage = "";
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchUnpaidPayments.pending, (state) => {
        state.isLoadingList = true;
        state.isErrorList = false;
        state.listMessage = "";
      })
      .addCase(fetchUnpaidPayments.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.items = action.payload || [];
      })
      .addCase(fetchUnpaidPayments.rejected, (state, action) => {
        state.isLoadingList = false;
        state.isErrorList = true;
        state.listMessage =
          action.payload ||
          "Failed to load issued & unpaid credentials";
      })

      // confirm payment
      .addCase(confirmPayment.pending, (state) => {
        state.isSavingPayment = true;
        state.saveError = null;
      })
      .addCase(confirmPayment.fulfilled, (state) => {
        state.isSavingPayment = false;
        state.saveError = null;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.isSavingPayment = false;
        state.saveError =
          action.payload || "Failed to confirm payment";
      });
  },
});

export const { resetPaymentError } = paymentSlice.actions;
export default paymentSlice.reducer;
