import React from "react";
import styless from "./ChatMenu.module.scss";
import { UserRound } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import {
  setCurrentChatData,
  setCurrentChatId,
} from "@/store/slices/ChatInfoSlice";
import USER_COLORS from "@/const/user_colors";
import mock_users from "@/const/mock_users";

const ChatMenu: React.FC = () => {
  const { currentChatData } = useAppSelector((state) => state.chatInfo);
  const dispatch = useAppDispatch();

  return (
    <>
      <div className={styless.chat_menu}>
        {/* User box */}
        {mock_users.map((user, index) => (
          <div
            className={`${styless.user_box} ${currentChatData.id === user.id ? styless.user_box_selected : ""}`}
            key={user.id}
            onClick={() => dispatch(setCurrentChatData(user))}
          >
            <div
              className={styless.user_box_avatar}
              style={{
                backgroundColor: USER_COLORS[user.id % USER_COLORS.length],
              }}
            >
              <UserRound size={14} />

              {user.isOnline && (
                <span className={styless.user_box_online_indicator} />
              )}
            </div>
            {/* User body */}
            <div className={styless.user_box_body}>
              {/* left side - user info & message */}
              <div className={styless.left_side}>
                <p className={styless.left_side_name}>{user.name}</p>
                <p className={styless.left_side_message}>{user.message}</p>
              </div>
              {/* right side - time & unread count */}
              <div className={styless.right_side}>
                <p className={styless.right_side_time}>
                  {user.lastMessageTime}
                </p>
                {user.unreadCount > 0 && (
                  <span className={styless.right_side_unread}>
                    {user.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ChatMenu;
