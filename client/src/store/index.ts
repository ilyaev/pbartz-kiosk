import { configureStore } from "@reduxjs/toolkit";
import sceneReducer from "./sceneSlice";
import kioskReducer from "./kioskSlice"; // Import the new slice

export const store = configureStore({
  reducer: {
    scene: sceneReducer,
    kiosk: kioskReducer, // Add the new slice to the store
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
