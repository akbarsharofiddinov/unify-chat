import { createSlice } from "@reduxjs/toolkit";

interface IState {
  currentChatId?: string;
  currentChatData: any;
  currentUserInfo: {
    permission: {};
    department: string;
    district: string;
    full_name: string;
    id: number;
    is_active: boolean;
    position: string;
    region: string;
    role: string;
    user_permissions: string[];
    username: string;
    department_category: string;
    department_id: number;
    employee_id?: number;
    district_id?: number;
    phone: string | null;
  };
}

const initialState: IState = {
  currentChatData: null,
  currentUserInfo: {
    permission: {},
    department: "",
    district: "",
    full_name: "",
    id: 0,
    is_active: false,
    position: "",
    region: "",
    role: "",
    user_permissions: [],
    username: "",
    department_category: "",
    department_id: 0,
    employee_id: undefined,
    district_id: undefined,
    phone: null,
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

    setCurrentUserInfo: (state, action) => {
      state.currentUserInfo = action.payload;
    },
  },
});

export const { setCurrentChatId, setCurrentChatData, setCurrentUserInfo } =
  chatInfoSlice.actions;

export default chatInfoSlice.reducer;
