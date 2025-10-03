// app/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import userReducer from "../features/users/userSlice";
import studentReducer from "../features/student/studentSlice";
import vcReducer from "../features/draft_vc/vcSlice";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import storage from "redux-persist/lib/storage";

// 🔑 Give each slice its own persist config
const authPersistConfig = { key: "auth", storage };
const studentPersistConfig = { key: "student", storage };
const userPersistConfig = { key: "users", storage };
const vcPersistConfig = { key: "vc", storage };

// Wrap reducers individually
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedStudentReducer = persistReducer(studentPersistConfig, studentReducer);
const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
const persistedVcReducer = persistReducer(vcPersistConfig, vcReducer);  // ✅ fixed

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    student: persistedStudentReducer,
    users: persistedUserReducer,
    vc: persistedVcReducer,  // ✅ now persisted correctly
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
