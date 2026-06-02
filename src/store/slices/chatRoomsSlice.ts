import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ChatRoomsState {
  rooms: ChatRoom[];
}

const initialState: ChatRoomsState = {
  rooms: [],
};

/** Sort rooms newest-first by last_message.created_at. Rooms without a
 *  last message fall to the bottom. */
const sortByLastMessage = (rooms: ChatRoom[]): ChatRoom[] =>
  [...rooms].sort((a, b) => {
    const aTime = a.last_message?.created_at
      ? new Date(a.last_message.created_at).getTime()
      : 0;
    const bTime = b.last_message?.created_at
      ? new Date(b.last_message.created_at).getTime()
      : 0;
    return bTime - aTime;
  });

export const chatRoomsSlice = createSlice({
  name: "chatRooms",
  initialState,
  reducers: {
    setChatRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = sortByLastMessage(action.payload);
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
      const updated = state.rooms.map((room) =>
        room.id === action.payload.roomId
          ? { ...room, last_message: action.payload.last_message }
          : room,
      );
      state.rooms = sortByLastMessage(updated);
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
