import { configureStore } from "@reduxjs/toolkit";
import { chatInfoSlice } from "./slices/chatInfoSlice";
import { chatRoomsSlice } from "./slices/chatRoomsSlice";

export const store = configureStore({
  reducer: {
    chatInfo: chatInfoSlice.reducer,
    chatRooms: chatRoomsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
