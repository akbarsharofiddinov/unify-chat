import { axiosAPI } from "@/service/axiosAPI";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import styless from "./ChatRoom.module.scss";
import {
  Info,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  SendHorizonal,
  Video,
} from "lucide-react";
import clsx from "clsx";

const ChatRoom: React.FC = () => {
  const [chatData, setChatData] = useState<RoomData | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const { room_id } = useParams();

  async function fetchRoomData() {
    try {
      const response = await axiosAPI.get(`room/${room_id}/`);

      if (response.status === 200) {
        setChatData(response.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchMessages() {
    try {
      setLoadingMessages(true);

      const response = await axiosAPI.get(`room/${room_id}/messages/?limit=30`);

      if (response.status === 200) {
        setMessages(response.data.results);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (room_id) {
      fetchRoomData();
      fetchMessages();
    }
  }, [room_id]);

  const roomTitle = useMemo(() => {
    if (!chatData) return "Chat";

    if (chatData.type === "group") {
      return chatData.name;
    }

    return (
      chatData.members?.find((member) => !member.is_me)?.full_name ||
      "Shaxsiy chat"
    );
  }, [chatData]);

  return (
    <>
      <div className={styless.chat_room}>
        {/* Header */}
        <header className={styless.chat_header}>
          <div className={styless.chat_header_left}>
            <div className={styless.chat_avatar}>{roomTitle?.[0]}</div>

            <div className={styless.chat_info}>
              <h2>{roomTitle}</h2>

              <span>
                {chatData?.type === "group"
                  ? `${chatData?.members?.length || 0} a'zo`
                  : "online"}
              </span>
            </div>
          </div>

          <div className={styless.chat_header_actions}>
            <button>
              <Search size={20} />
            </button>

            <button>
              <Phone size={20} />
            </button>

            <button>
              <Video size={20} />
            </button>

            <button>
              <Info size={20} />
            </button>

            <button>
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className={styless.chat_messages}>
          <div className={styless.messages_date}>
            <span>Bugun</span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                styless.message_wrapper,
                msg.is_my
                  ? styless.message_wrapper_me
                  : styless.message_wrapper_other,
              )}
            >
              <div
                className={clsx(
                  styless.message,
                  msg.is_my ? styless.message_me : styless.message_other,
                )}
              >
                {!msg.is_my && (
                  <span className={styless.message_sender}>
                    {msg.sender?.full_name}
                  </span>
                )}

                <p>{msg.text}</p>

                <div className={styless.message_footer}>
                  <span>{msg.created_at}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className={styless.chat_input_wrapper}>
          <button className={styless.attach_btn}>
            <Paperclip size={20} />
          </button>

          <div className={styless.chat_input_box}>
            <textarea
              placeholder="Xabar yozing..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={1}
            />
          </div>

          <button className={styless.send_btn}>
            <SendHorizonal size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatRoom;
