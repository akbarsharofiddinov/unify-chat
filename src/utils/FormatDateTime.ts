/**
 * Format timestamp into human-readable format following messenger style
 * 
 * Examples:
 * - Today: "18:29"
 * - Yesterday: "Yesterday 18:29"
 * - This week: "Mon 18:29"
 * - Older: "29 May, 18:29"
 * - Different year: "29 May 2025, 18:29"
 */
export function formatDateTime(timeStr: string): string {
  if (!timeStr) return "";

  const messageDate = new Date(timeStr);
  const now = new Date();

  // Extract time components
  const hours = messageDate.getHours().toString().padStart(2, "0");
  const minutes = messageDate.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  // Get day boundaries
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  // Same day - just time
  if (messageDay.getTime() === today.getTime()) {
    return time;
  }

  // Yesterday
  if (messageDay.getTime() === yesterday.getTime()) {
    return `Yesterday ${time}`;
  }

  // This week (within last 7 days)
  const daysDiff = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  if (daysDiff < 7) {
    return `${dayNames[messageDate.getDay()]} ${time}`;
  }

  // Same year - show date
  if (messageDate.getFullYear() === now.getFullYear()) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const date = messageDate.getDate();
    const month = months[messageDate.getMonth()];
    return `${date} ${month}, ${time}`;
  }

  // Different year - include year
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const date = messageDate.getDate();
  const month = months[messageDate.getMonth()];
  const year = messageDate.getFullYear();
  return `${date} ${month} ${year}, ${time}`;
}