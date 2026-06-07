import React from "react";
import { Clock, Check, CheckCheck } from "lucide-react";
import type { MessageStatus } from "@/utils/MessageStatus";
import styles from "./MessageStatusIcon.module.scss";

interface MessageStatusIconProps {
  status: MessageStatus;
}

/**
 * Messenger-style message status indicator
 * - Clock: Message is being sent
 * - Check: Message was sent
 * - CheckCheck: Message has been read
 */
export const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({ status }) => {
  const renderIcon = () => {
    switch (status) {
      case "sending":
        return <Clock size={14} className={styles.icon_sending} color="#d1d5de" />;
      case "sent":
        return <Check size={14} className={styles.icon_sent} color="#d1d5de" />;
      case "read":
        return <CheckCheck size={14} className={styles.icon_read} color="#d1d5de" />;
    }
  };

  return <div className={styles.status_icon}>{renderIcon()}</div>;
};
