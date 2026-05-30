/**
 * Message status indicator system for messenger-style UI
 * 
 * Status Flow:
 * "sending" -> "sent" -> "read"
 */

export type MessageStatus = "sending" | "sent" | "read";

/**
 * Determines message status based on:
 * - Whether it's in pending set (being sent)
 * - Whether it has been read by recipients
 * 
 * @param messageId - Message ID
 * @param isPending - Whether message is currently being sent
 * @param readsCount - Number of users who have read the message
 * @returns Current message status
 */
export function getMessageStatus(
  messageId: number,
  isPending: boolean,
  readsCount: number
): MessageStatus {
  if (isPending) return "sending";
  if (readsCount > 0) return "read";
  return "sent";
}

/**
 * Get icon props for message status
 * Used for rendering status indicators
 */
export function getStatusIcon(status: MessageStatus): {
  icon: "clock" | "check" | "checkDouble";
  label: string;
  color: string;
} {
  switch (status) {
    case "sending":
      return {
        icon: "clock",
        label: "Sending...",
        color: "#9ca3af",
      };
    case "sent":
      return {
        icon: "check",
        label: "Sent",
        color: "#6b7280",
      };
    case "read":
      return {
        icon: "checkDouble",
        label: "Read",
        color: "#2563eb",
      };
  }
}
