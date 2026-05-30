import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ChatRoomsState {
  rooms: ChatRoom[];
}

const initialState: ChatRoomsState = {
  rooms: [],
};

export const chatRoomsSlice = createSlice({
  name: "chatRooms",
  initialState,
  reducers: {
    setChatRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = action.payload;
    },
    updateRoomUnreadCount: (
      state,
      action: PayloadAction<{ roomId: number; unread_count: number }>,
    ) => {
      state.rooms = state.rooms.map((room) =>
        room.id === action.payload.roomId
          ? { ...room, unread_count: action.payload.unread_count }
          : room,
      );
    },
    setRoomLastMessage: (
      state,
      action: PayloadAction<{ roomId: number; last_message: LastMessage }>,
    ) => {
      state.rooms = state.rooms.map((room) =>
        room.id === action.payload.roomId
          ? { ...room, last_message: action.payload.last_message }
          : room,
      );
    },
    incrementRoomUnreadCount: (
      state,
      action: PayloadAction<{ roomId: number; delta: number }>,
    ) => {
      state.rooms = state.rooms.map((room) =>
        room.id === action.payload.roomId
          ? { ...room, unread_count: Math.max(0, room.unread_count + action.payload.delta) }
          : room,
      );
    },
  },
});

export const {
  setChatRooms,
  updateRoomUnreadCount,
  setRoomLastMessage,
  incrementRoomUnreadCount,
} = chatRoomsSlice.actions;

export default chatRoomsSlice.reducer;
