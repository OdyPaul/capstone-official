// src/features/accounts/accountsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import accountService from './accountService';

const initialState = {
  items: [],
  isLoading: false,
  isError: false,
  message: '',
};

export const fetchAccounts = createAsyncThunk('accounts/list', async (_, thunkAPI) => {
  try { return await accountService.list(); }
  catch (e) {
    const m = e.response?.data?.message || e.message || 'Failed to load accounts';
    return thunkAPI.rejectWithValue(m);
  }
});

export const createAccount = createAsyncThunk('accounts/create', async (payload, thunkAPI) => {
  try { return await accountService.create(payload); }
  catch (e) {
    const m = e.response?.data?.message || e.message || 'Failed to create account';
    return thunkAPI.rejectWithValue(m);
  }
});

// NEW: updateAccount
export const updateAccount = createAsyncThunk('accounts/update', async ({ id, data }, thunkAPI) => {
  try {
    const updated = await accountService.update(id, data);

    // If the updated user is the currently logged-in user, refresh localStorage so header updates (name/photo).
    const me = thunkAPI.getState().auth.user;
    if (me && me._id === updated._id) {
      const next = {
        ...me,
        username: updated.username,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        profilePicture: updated.profilePicture,
        contactNo: updated.contactNo,
        gender: updated.gender,
        address: updated.address,
        age: updated.age,
      };
      try { localStorage.setItem('user', JSON.stringify(next)); } catch {}
    }

    return updated;
  } catch (e) {
    const m = e.response?.data?.message || e.message || 'Failed to update account';
    return thunkAPI.rejectWithValue(m);
  }
});

const slice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    resetAccounts: (s) => { s.isLoading = false; s.isError = false; s.message=''; },
  },
  extraReducers: (b) => {
    b.addCase(fetchAccounts.pending,  (s)=>{ s.isLoading = true; s.isError=false; s.message=''; })
     .addCase(fetchAccounts.fulfilled,(s,a)=>{ s.isLoading = false; s.items = a.payload || []; })
     .addCase(fetchAccounts.rejected, (s,a)=>{ s.isLoading = false; s.isError = true; s.message = a.payload; })

     .addCase(createAccount.pending,  (s)=>{ s.isLoading = true; s.isError=false; s.message=''; })
     .addCase(createAccount.fulfilled,(s,a)=>{ s.isLoading = false; if (a.payload) s.items = [a.payload, ...s.items]; })
     .addCase(createAccount.rejected, (s,a)=>{ s.isLoading = false; s.isError = true; s.message = a.payload; })

     // NEW reducers for update
     .addCase(updateAccount.pending,  (s)=>{ s.isLoading = true; s.isError=false; s.message=''; })
     .addCase(updateAccount.fulfilled,(s,a)=>{
        s.isLoading = false;
        const u = a.payload;
        if (!u) return;
        s.items = s.items.map(it => it._id === u._id ? u : it);
     })
     .addCase(updateAccount.rejected, (s,a)=>{ s.isLoading = false; s.isError = true; s.message = a.payload; });
  }
});

export const { resetAccounts } = slice.actions;
export default slice.reducer;
