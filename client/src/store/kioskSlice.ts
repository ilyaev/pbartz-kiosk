import { createSlice } from "@reduxjs/toolkit";

export enum Scene {
  Spotify = "Spotify",
  Finance = "Finance",
  News = "News",
  APOD = "APOD",
  HistoryEvents = "HistoryEvents",
  Fallacy = "Fallacy",
  Bias = "Bias",
}

export interface KioskState {
  scenes: Scene[];
  lastMotion: number;
  lastLight: number;
}

const initialState: KioskState = {
  scenes: [
    Scene.Finance,
    Scene.Fallacy,
    Scene.APOD,
    Scene.HistoryEvents,
    Scene.Bias,
    Scene.Spotify,
  ],
  // scenes: [Scene.Finance],
  // scenes: [Scene.APOD, Scene.Spotify],
  // scenes: [Scene.APOD],
  // scenes: [Scene.HistoryEvents],
  // scenes: [Scene.Spotify],
  // scenes: [Scene.Fallacy],
  // scenes: [Scene.Bias],
  lastMotion: 1,
  lastLight: 1,
};

const kioskSlice = createSlice({
  name: "kiosk",
  initialState,
  reducers: {
    setCurrentScenes(state, action: { payload: Scene[] }) {
      state.scenes = action.payload;
    },
    setLastMotion(state, action: { payload: number }) {
      state.lastMotion = action.payload;
    },
    setLastLight(state, action: { payload: number }) {
      state.lastLight = action.payload;
    },
    setLastLigtMotion(
      state,
      action: { payload: { light: number; motion: number } }
    ) {
      state.lastLight = action.payload.light;
      state.lastMotion = action.payload.motion;
    },
  },
});

export const {
  setCurrentScenes,
  setLastMotion,
  setLastLight,
  setLastLigtMotion,
} = kioskSlice.actions;
export default kioskSlice.reducer;
