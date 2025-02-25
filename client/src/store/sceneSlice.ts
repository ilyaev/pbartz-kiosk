import { createSlice } from "@reduxjs/toolkit";

export const sceneSlice = createSlice({
  name: "scene",
  initialState: {
    value: "initialScene",
  },
  reducers: {
    setScene: (state, action) => {
      state.value = action.payload;
    },
  },
});

export const { setScene } = sceneSlice.actions;

export default sceneSlice.reducer;
