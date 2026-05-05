import { createSlice } from "@reduxjs/toolkit";

interface IState {
  currentChatId?: string;
  currentChatData: any;
}

const initialState: IState = {
  currentChatData: {
    id: 5,
    name: "Jasur Abduvaliyev",
    message: "Yangilanishni ko‘rdingizmi?",
    lastMessageTime: "11:20",
    unreadCount: 0,
  },
};

export const chatInfoSlice = createSlice({
  name: "chatInfo",
  initialState,
  reducers: {
    setCurrentChatId: (state, action) => {
      state.currentChatId = action.payload;
    },

    setCurrentChatData: (state, action) => {
      state.currentChatData = action.payload;
    },
  },
});

export const { setCurrentChatId, setCurrentChatData } = chatInfoSlice.actions;

export default chatInfoSlice.reducer;
