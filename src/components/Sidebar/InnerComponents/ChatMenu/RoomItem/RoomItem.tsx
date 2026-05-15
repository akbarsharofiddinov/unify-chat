import React from "react";
import styless from "../ChatMenu.module.scss";
import USER_COLORS from "@/const/user_colors";
import { UserRound } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import { setCurrentChatData } from "@/store/slices/ChatInfoSlice";
import { formatDateTime } from "@/utils/FormatDateTime";
import { useNavigate } from "react-router-dom";

interface IProps {
  user: ChatRoom;
}

const RoomItem: React.FC<IProps> = ({ user }) => {
  const { currentChatData } = useAppSelector((state) => state.chatInfo);
  const dispatch = useAppDispatch();

  const navigate = useNavigate();

  return (
    <>
      <div
        className={`${styless.user_box} ${currentChatData && currentChatData.id === user.id ? styless.user_box_selected : ""}`}
        key={user.id}
        onClick={() => {
          dispatch(setCurrentChatData(user));
          navigate(`/room/${user.id}`);
        }}
      >
        <div
          className={styless.user_box_avatar}
          style={{
            backgroundColor: USER_COLORS[user.id % USER_COLORS.length],
          }}
        >
          <UserRound size={14} />

          {/* {user.isOnline && (
            <span className={styless.user_box_online_indicator} />
          )} */}
        </div>
        {/* User body */}
        <div className={styless.user_box_body}>
          {/* left side - user info & message */}
          <div className={styless.left_side}>
            <p className={styless.left_side_name}>{user.name || "Noma'lum"}</p>
            <p className={styless.left_side_message}>
              {user.last_message.text}
            </p>
          </div>
          {/* right side - time & unread count */}
          <div className={styless.right_side}>
            <p className={styless.right_side_time}>
              {formatDateTime(user.last_message.created_at)}
            </p>
            {user.unread_count > 0 && (
              <span className={styless.right_side_unread}>
                {user.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(RoomItem);
