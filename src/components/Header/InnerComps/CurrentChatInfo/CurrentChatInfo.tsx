import React from "react";
import { useAppSelector } from "@/store/hooks/hooks";
import styless from "./CurrentChatInfo.module.scss";
import { UserRound } from "lucide-react";
import USER_COLORS from "@/const/user_colors";

const CurrentChatInfo: React.FC = () => {
  const { currentChatData } = useAppSelector((state) => state.chatInfo);

  return (
    <>
      <div className={styless.current_chat_info}>
        {currentChatData.avatar ? (
          <img src={currentChatData.avatar} alt="Chat Avatar" />
        ) : (
          <span
            className={styless.avatar}
            style={{
              backgroundColor:
                USER_COLORS[currentChatData.id % USER_COLORS.length],
            }}
          >
            <UserRound size={14} />
          </span>
        )}

        <div className={styless.chat_info}>
          <span className={styless.chat_name}>{currentChatData.name}</span>
          <span className={styless.chat_status}>
            {currentChatData.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </>
  );
};

export default CurrentChatInfo;
