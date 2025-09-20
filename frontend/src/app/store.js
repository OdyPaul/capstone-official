import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import userReducer from "../features/users/userSlice";
import studentReducer from "../features/student/studentSlice";
import vcReducer from "../features/draft_vc/vcSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    student: studentReducer,
    vc: vcReducer,   // 👈 add this
  },
});
