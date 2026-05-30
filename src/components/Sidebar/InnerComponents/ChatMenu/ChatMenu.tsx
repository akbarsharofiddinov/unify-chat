import React, { useCallback, useEffect, useState } from "react";
import styless from "./ChatMenu.module.scss";
// import mock_users from "@/const/mock_users";
import RoomItem from "./RoomItem/RoomItem";
import { axiosAPI } from "@/service/axiosAPI";

interface IProps {
  registerRefresh?: (fn: () => void) => void;
}

const ChatMenu: React.FC<IProps> = ({ registerRefresh }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  const fetchChatRooms = useCallback(async () => {
    try {
      const { status, data }: { status: number; data: ChatRoomsResponse } =
        await axiosAPI.get("room/");
      if (status === 200) setChatRooms(data.results);
      console.log(data.results)
    } catch (error) {
      console.log(error);
    }
  }, []);

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
          chatRooms.map((user, index) => <RoomItem key={index} user={user} />)
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
