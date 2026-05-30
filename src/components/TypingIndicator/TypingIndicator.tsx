import React from "react";
import styles from "./TypingIndicator.module.scss";

interface TypingIndicatorProps {
  users: Array<{ id: number; full_name: string }>;
}

/**
 * Messenger-style typing indicator with animated dots
 * Shows when other users are typing in real-time
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (!users.length) return null;

  const userNames =
    users.length === 1
      ? users[0].full_name
      : `${users.length} ${users.length === 1 ? "user" : "users"}`;

  return (
    <div className={styles.typing_wrapper}>
      <div className={styles.typing_content}>
        <span className={styles.typing_text}>{userNames}</span>
        <div className={styles.typing_dots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
    </div>
  );
};
