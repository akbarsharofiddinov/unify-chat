import React, { useCallback, useEffect } from "react";
import styless from "./ChatMenu.module.scss";
import RoomItem from "./RoomItem/RoomItem";
import { axiosAPI } from "@/service/axiosAPI";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import { setChatRooms } from "@/store/slices/chatRoomsSlice";

interface IProps {
  registerRefresh?: (fn: () => void) => void;
}

const ChatMenu: React.FC<IProps> = ({ registerRefresh }) => {
  const dispatch = useAppDispatch();
  const chatRooms = useAppSelector((state) => state.chatRooms.rooms);

  const fetchChatRooms = useCallback(async () => {
    try {
      const { status, data }: { status: number; data: ChatRoomsResponse } =
        await axiosAPI.get("room/");
      if (status === 200) dispatch(setChatRooms(data.results));
    } catch (error) {
      console.log(error);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  useEffect(() => {
    registerRefresh?.(fetchChatRooms);
  }, [fetchChatRooms, registerRefresh]);

  return (
    <>
      <div className={styless.chat_menu}>
        {/* User box */}
        {chatRooms.length > 0 ? (
          chatRooms.map((user) => <RoomItem key={user.id} user={user} />)
        ) : (
          <div className={styless.no_rooms}>
            <h1>Chatlar mavjud emas.</h1>
            <p>Yangi chat yaratish uchun pastdagi "+" tugmasini bosing.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(ChatMenu);
