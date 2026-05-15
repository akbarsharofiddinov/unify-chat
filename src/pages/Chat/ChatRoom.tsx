import React, { useState } from "react";
import { useParams } from "react-router-dom";

const ChatRoom: React.FC = () => {
  const [chatData, setChatData] = useState()

  const {room_id} = useParams();

  return (
    <>
      
    </>
  );
};

export default ChatRoom;
