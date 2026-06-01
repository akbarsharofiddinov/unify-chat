import React, { memo, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import styless from "./CurrentChatInfo.module.scss";
import { ArrowLeft, UserRound } from "lucide-react";
import USER_COLORS from "@/const/user_colors";
import { useNavigate, useParams } from "react-router-dom";
import { setCurrentChatData } from "@/store/slices/chatInfoSlice";

const CurrentChatInfo: React.FC = () => {
  const { currentChatData } = useAppSelector((state) => state.chatInfo);
  const { room_id } = useParams();

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const roomTitle = useMemo(() => {
      if (!currentChatData) return "Chat";
  
      if (currentChatData.type === "group") {
        return currentChatData.name;
      }
  
      const companion = (currentChatData.members as any[])?.find((member) => !member.is_me) as any;
      return companion?.fulle_name || companion?.full_name || "Shaxsiy chat";
    }, [currentChatData]);

  return (
    <>
      {currentChatData && (
        <div className={styless.current_chat_info}>
          {room_id && (
            <button
              className={styless.back_button}
              onClick={() => {
                dispatch(setCurrentChatData(null));
                navigate("/");
              }}
            >
              <ArrowLeft />
            </button>
          )}
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
            <span className={styless.chat_name}>{roomTitle}</span>
            <span className={styless.chat_status}>
              {currentChatData.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(CurrentChatInfo);
