import React, { useMemo, useState } from "react";
import styless from "./CreateRoomModal.module.scss";
import { Users, UserRound, X } from "lucide-react";
import clsx from "clsx";
import { axiosAPI } from "@/service/axiosAPI";

interface IUser {
  id: number;
  full_name: string;
  avatar?: string | null;
}

interface IProps {
  type: roomType;
  onClose?: () => void;
  onSuccess?: (room: any) => void;
}

const mockUsers: IUser[] = [
  {
    id: 12,
    full_name: "Ali Valiyev",
  },
  {
    id: 15,
    full_name: "Sardor Karimov",
  },
  {
    id: 18,
    full_name: "Jahongir Axmedov",
  },
];

const CreateRoomModal: React.FC<IProps> = ({
  type,
  onClose,
  onSuccess,
}) => {
  const [roomName, setRoomName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const isGroup = useMemo(() => type === "group", [type]);

  const handleToggleUser = (id: number) => {
    setSelectedUsers((prev) => {
      if (isGroup) {
        return prev.includes(id)
          ? prev.filter((userId) => userId !== id)
          : [...prev, id];
      }

      return prev.includes(id) ? [] : [id];
    });
  };

  const handleCreateRoom = async () => {
    try {
      setLoading(true);

      const payload = {
        type,
        project: "m_gaz",
        ...(isGroup && {
          name: roomName,
        }),
        member_ids: selectedUsers,
      };

      const response = await axiosAPI.post("/room/", payload);

      if (response.status === 201) {
        onSuccess?.(response.data);
        onClose?.();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = useMemo(() => {
    if (loading) return true;

    if (isGroup) {
      return roomName.trim().length < 2 || selectedUsers.length === 0;
    }

    return selectedUsers.length !== 1;
  }, [isGroup, loading, roomName, selectedUsers]);

  return (
    <>
      <div className={styless.overlay} onClick={onClose}>
        <div
          className={styless.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styless.header}>
            <div className={styless.title_box}>
              <div className={styless.icon}>
                {isGroup ? <Users size={20} /> : <UserRound size={20} />}
              </div>

              <div>
                <h2>
                  {isGroup
                    ? "Yangi guruh yaratish"
                    : "Yangi chat boshlash"}
                </h2>

                <p>
                  {isGroup
                    ? "Guruh uchun a'zolar tanlang"
                    : "Chat boshlash uchun foydalanuvchini tanlang"}
                </p>
              </div>
            </div>

            <button
              className={styless.close_btn}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Group name */}
          {isGroup && (
            <div className={styless.input_box}>
              <label>Guruh nomi</label>

              <input
                type="text"
                placeholder="Masalan: Frontend Team"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
          )}

          {/* Users */}
          <div className={styless.users_wrapper}>
            <span className={styless.users_title}>
              Foydalanuvchilar
            </span>

            <div className={styless.users_list}>
              {mockUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);

                return (
                  <button
                    key={user.id}
                    className={clsx(
                      styless.user_item,
                      isSelected && styless.user_item_active,
                    )}
                    onClick={() => handleToggleUser(user.id)}
                  >
                    <div className={styless.avatar}>
                      {user.full_name[0]}
                    </div>

                    <div className={styless.user_info}>
                      <strong>{user.full_name}</strong>
                      <span>ID: {user.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className={styless.footer}>
            <button
              className={styless.cancel_btn}
              onClick={onClose}
            >
              Bekor qilish
            </button>

            <button
              className={styless.create_btn}
              disabled={isDisabled}
              onClick={handleCreateRoom}
            >
              {loading
                ? "Yaratilmoqda..."
                : isGroup
                  ? "Guruh yaratish"
                  : "Chat boshlash"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateRoomModal;