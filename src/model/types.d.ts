type projectSlug = "m_gaz" | "ekompletasiya";
type roomType = "direct" | "group";
type messageType = "text" | "file" | "image" | "voice";

interface ChatRoom {
  id: number;
  avatar: string | null;
  created_at: string;
  name: string;
  project: projectSlug;
  type: roomType;
  unread_count: number;
  last_message: LastMessage;
  companion: {
    avatar: string | null;
    full_name: string;
    id: number;
  }
}

interface defaultResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ChatRoomsResponse extends defaultResponse {
  results: ChatRoom[];
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

interface IUser {
  id: number
  username: string
  full_name: string
  region: string
  district: string
  department: string
  position: string
  role: string
  is_active: boolean
  permission: any
  department_id: string
  department_category: string
  employee_id: string
  sub_department_category: any
  ware_house: any[]
  sub_department: any
  sub_department_id: any
  position_id: string
  region_id: string
  district_id: string
  role_employee: any
  photo_url: any
  phone: string
}
