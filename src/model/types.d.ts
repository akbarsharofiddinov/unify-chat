interface MockUser {
  id: number;
  name: string;
  message: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface ChatRoom {
  id: number;
  avatar: string | null;
  created_at: string;
  name: string;
  project: string;
  type: "direct" | "group";
  unread_count: number;
  last_message: LastMessage;
}

interface LastMessage {
  id: number;
  created_at: string;
  sender_id: number;
  text: string;
  type: "text" | "file" | "image" | "voice";
}
