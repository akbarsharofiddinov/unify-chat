import React, { useEffect, useState } from "react";
import styless from "./ChatMenu.module.scss";
// import mock_users from "@/const/mock_users";
import RoomItem from "./RoomItem/RoomItem";
import { axiosAPI } from "@/service/axiosAPI";

const ChatMenu: React.FC = () => {
  const [chatRooms, setChatRooms] = useState([]);

  useEffect(() => {
    async function fetchChatRooms() {
      try {
        const response = await axiosAPI.get("room/");
        if (response.status === 200) setChatRooms(response.data.results);
      } catch (error) {
        console.log(error);
      }
    }

    fetchChatRooms();
  }, []);

  return (
    <>
      <div className={styless.chat_menu}>
        {/* User box */}
        {chatRooms.map((user, index) => (
          <RoomItem key={index} user={user} />
        ))}
      </div>
    </>
  );
};

export default React.memo(ChatMenu);
