import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import templateService from "./templateService";

/* ---------- utils ---------- */
const getMessage = (err) =>
  err?.response?.data?.message ||
  err?.response?.data ||
  err?.message ||
  "Request failed";

/* ---------- thunks ---------- */

// Create a template, then refetch list (server-populated fields)
export const createTemplate = createAsyncThunk(
  "template/createTemplate",
  async (payload, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const created = await templateService.createTemplate(payload, token);
      const refreshed = await templateService.getTemplates({}, token);
      return { created, refreshed };
    } catch (err) {
      return thunkAPI.rejectWithValue(getMessage(err));
    }
  }
);

// Get templates with filters (backend accepts ?q= only; extra filters are ignored)
export const getTemplates = createAsyncThunk(
  "template/getTemplates",
  async (filters, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const data = await templateService.getTemplates(filters || {}, token);
      const toStore = filters || {};
      localStorage.setItem("lastTemplateFilters", JSON.stringify(toStore));
      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(getMessage(err));
    }
  }
);

// Get one template
export const getTemplateById = createAsyncThunk(
  "template/getTemplateById",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await templateService.getTemplateById(id, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(getMessage(err));
    }
  }
);

// Update a template (uses PUT to align with backend)
export const updateTemplate = createAsyncThunk(
  "template/updateTemplate",
  async ({ id, data }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const updated = await templateService.updateTemplate(id, data, token);
      return updated;
    } catch (err) {
      return thunkAPI.rejectWithValue(getMessage(err));
    }
  }
);

// Delete a template
export const deleteTemplate = createAsyncThunk(
  "template/deleteTemplate",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const deleted = await templateService.deleteTemplate(id, token);
      return deleted; // expect {_id} or the deleted document
    } catch (err) {
      return thunkAPI.rejectWithValue(getMessage(err));
    }
  }
);

/* ---------- state ---------- */
const initialState = {
  items: [],
  item: null,
  isLoadingList: false,
  isLoadingOne: false,
  isLoadingCreate: false,
  isLoadingUpdate: false,
  isLoadingDelete: false,
  isSuccess: false,
  isError: false,
  message: "",
};

/* ---------- slice ---------- */
const templateSlice = createSlice({
  name: "template",
  initialState,
  reducers: {
    resetTemplate: (state) => {
      state.isLoadingList = false;
      state.isLoadingOne = false;
      state.isLoadingCreate = false;
      state.isLoadingUpdate = false;
      state.isLoadingDelete = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    clearTemplates: (state) => {
      state.items = [];
      state.item = null;
      state.isLoadingList = false;
      state.isLoadingOne = false;
      state.isLoadingCreate = false;
      state.isLoadingUpdate = false;
      state.isLoadingDelete = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    setFocusedTemplate: (state, action) => {
      state.item = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // create
      .addCase(createTemplate.pending, (state) => {
        state.isLoadingCreate = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.isLoadingCreate = false;
        state.isSuccess = true;
        const { created, refreshed } = action.payload || {};
        state.items = refreshed || (created ? [created, ...state.items] : state.items);
        state.item = created || state.item;
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.isLoadingCreate = false;
        state.isError = true;
        state.message = action.payload;
      })

      // list
      .addCase(getTemplates.pending, (state) => {
        state.isLoadingList = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(getTemplates.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.isSuccess = true;
        state.items = action.payload || [];
      })
      .addCase(getTemplates.rejected, (state, action) => {
        state.isLoadingList = false;
        state.isError = true;
        state.message = action.payload;
      })

      // one
      .addCase(getTemplateById.pending, (state) => {
        state.isLoadingOne = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(getTemplateById.fulfilled, (state, action) => {
        state.isLoadingOne = false;
        state.isSuccess = true;
        state.item = action.payload || null;
      })
      .addCase(getTemplateById.rejected, (state, action) => {
        state.isLoadingOne = false;
        state.isError = true;
        state.message = action.payload;
      })

      // update
      .addCase(updateTemplate.pending, (state) => {
        state.isLoadingUpdate = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.isLoadingUpdate = false;
        state.isSuccess = true;
        const updated = action.payload;
        state.items = state.items.map((t) =>
          (t._id || t.id) === (updated?._id || updated?.id) ? updated : t
        );
        if (state.item && (state.item._id || state.item.id) === (updated?._id || updated?.id)) {
          state.item = updated;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.isLoadingUpdate = false;
        state.isError = true;
        state.message = action.payload;
      })

      // delete
      .addCase(deleteTemplate.pending, (state) => {
        state.isLoadingDelete = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.isLoadingDelete = false;
        state.isSuccess = true;
        const removed = action.payload;
        const removedId = removed?._id || removed?.id || removed;
        state.items = state.items.filter((t) => (t._id || t.id) !== removedId);
        if (state.item && (state.item._id || state.item.id) === removedId) {
          state.item = null;
        }
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.isLoadingDelete = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const {
  resetTemplate,
  clearTemplates,
  setFocusedTemplate,
} = templateSlice.actions;

export const selectTemplates = (s) => s.template.items;
export const selectTemplateState = (s) => s.template;
export const selectTemplateById = (id) => (s) =>
  s.template.items.find((t) => (t._id || t.id) === id);

export default templateSlice.reducer;
