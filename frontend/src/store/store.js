import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import satelliteReducer from "./satelliteSlice"; // Import the new reducer

export const store = configureStore({
  reducer: {
    auth: authReducer,
    satellites: satelliteReducer, // Add the satellite reducer
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