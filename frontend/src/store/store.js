import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import satelliteReducer from "./satelliteSlice";
import analysisReducer from './analysisSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    satellites: satelliteReducer,
    analysis: analysisReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export default store;
