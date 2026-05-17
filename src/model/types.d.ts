type projectSlug = "m_gaz" | "ekompletasiya";
type roomType = "direct" | "group";
type messageType = "text" | "file" | "image" | "voice";

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
  project: projectSlug;
  type: roomType;
  unread_count: number;
  last_message: LastMessage;
}

interface LastMessage {
  id: number;
  created_at: string;
  sender_id: number;
  text: string;
  type: messageType;
}

interface MembersType {
  id: number;
  avatar_url: string | null;
  fulle_name: string;
  is_online: boolean;
  last_seen: string;
  project: projectSlug;
  role: string;
  room: number;
  user_id: number;
  created_at: string;
}

interface RoomData {
  id: number;
  avatar: string | null;
  name: string;
  project: projectSlug;
  type: roomType;
  members: MembersType[];
  created_at: string;
}

interface MembarData {
  id: number;
  full_name: string;
  avatar: string | null;
}

interface MessageData {
  id: number;
  type: messageType;
  text: string;
  file: File | null;
  is_my: boolean;
  reply_to: number | null;
  sender: MembarData;
  reads: {
    user: MembarData;
    read_at: string;
  }[];
  created_at: string;
}
