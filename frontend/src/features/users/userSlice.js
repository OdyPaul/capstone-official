// features/users/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import userService from './userService'

// -------------------- THUNKS --------------------

// Fetch all users
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user?.token
      return await userService.getUsers(token)
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString()
      return thunkAPI.rejectWithValue(message)
    }
  }
)

// -------------------- SLICE --------------------
const initialState = {
  list: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
}

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    reset: (state) => initialState, // ✅ keep your reset reducer
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.list = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.message = action.payload
      })
  }
})

export const { reset } = userSlice.actions
export default userSlice.reducer
