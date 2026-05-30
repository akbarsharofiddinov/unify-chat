import { configureStore } from "@reduxjs/toolkit";
import { chatInfoSlice } from "./slices/chatInfoSlice";

export const store = configureStore({
  reducer: {
    chatInfo: chatInfoSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
