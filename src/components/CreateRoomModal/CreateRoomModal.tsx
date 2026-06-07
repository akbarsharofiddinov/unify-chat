import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styless from "./CreateRoomModal.module.scss";
import { Users, UserRound, X } from "lucide-react";
import clsx from "clsx";
import { axiosAPI } from "@/service/axiosAPI";

const USERS_API_URL = "https://v3.ekomplektasiya.uz/api/users/all-internal/employees/";

// Yangi interface - response to'g'ridan-to'g'ri array qaytaradi
interface IUser {
  id: number;
  full_name: string;
  avatar: string | null;
}

// Cache strukturasini o'zgartiramiz
const usersCache = {
  currentSearch: "",
  users: [] as IUser[],
  requestUrl: null as string | null,
  requestPromise: null as Promise<IUser[]> | null,
};

const buildUsersUrl = (search: string) => {
  const url = new URL(USERS_API_URL);
  if (search.trim()) {
    url.searchParams.set("search", search.trim());
  }
  return url.toString();
};

// Yangi fetch funksiyasi - to'g'ridan-to'g'ri array qaytaradi
const fetchUsersPage = async (url: string): Promise<IUser[]> => {
  if (usersCache.requestPromise && usersCache.requestUrl === url) {
    return usersCache.requestPromise;
  }

  usersCache.requestUrl = url;
  usersCache.requestPromise = axiosAPI
    .get(url)
    .then((response) => {
      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      // Response to'g'ridan-to'g'ri array
      return response.data as IUser[];
    })
    .catch((error) => {
      usersCache.requestPromise = null;
      usersCache.requestUrl = null;
      throw error;
    });

  return usersCache.requestPromise;
};

interface IProps {
  type: roomType;
  onClose?: () => void;
  onSuccess?: (room: any) => void;
}

const CreateRoomModal: React.FC<IProps> = ({ type, onClose, onSuccess }) => {
  const [roomName, setRoomName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(usersCache.currentSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(usersCache.currentSearch);
  const [usersInitialLoading, setUsersInitialLoading] = useState(false);
  const [usersFetchingMore, setUsersFetchingMore] = useState(false);
  const [users, setUsers] = useState<IUser[]>(usersCache.users);
  const [hasMore, setHasMore] = useState(false); // API pagination bo'lmasa, false
  const isFetchingMoreRef = useRef(false);
  const currentSearchRef = useRef(usersCache.currentSearch);
  const debouncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usersListRef = useRef<HTMLDivElement | null>(null);
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
        project: "ekompletasiya",
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

  // Yangilangan fetchUsers - pagination yo'q, to'g'ridan-to'g'ri array
  const fetchUsers = useCallback(
    async (search: string) => {
      const url = buildUsersUrl(search);

      try {
        setUsersInitialLoading(true);
        const usersData = await fetchUsersPage(url);
        
        if (currentSearchRef.current !== search) {
          return;
        }

        setUsers(usersData);
        setHasMore(false); // API pagination qo'llab-quvvatlamaydi
        
        // Cacheni yangilash
        usersCache.currentSearch = search;
        usersCache.users = usersData;
        usersCache.requestPromise = null;
        usersCache.requestUrl = null;
      } catch (error) {
        console.log(error);
      } finally {
        setUsersInitialLoading(false);
      }
    },
    [],
  );

  // fetchMoreUsers endi ishlatilmaydi, chunki pagination yo'q
  // Agar kerak bo'lsa, lekin hozircha olib tashlaymiz

  useEffect(() => {
    if (usersCache.users.length === 0) {
      currentSearchRef.current = "";
      fetchUsers("");
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
    }

    debouncedTimerRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => {
      if (debouncedTimerRef.current) {
        clearTimeout(debouncedTimerRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedSearch === usersCache.currentSearch) return;

    currentSearchRef.current = debouncedSearch;
    usersCache.currentSearch = debouncedSearch;
    usersCache.users = [];
    usersCache.requestPromise = null;
    usersCache.requestUrl = null;

    setUsers([]);
    fetchUsers(debouncedSearch);
  }, [debouncedSearch, fetchUsers]);

  // Scroll handler endi ishlatilmaydi (pagination yo'q)
  // Agar kerak bo'lmasa, olib tashlash mumkin

  const isDisabled = useMemo(() => {
    if (loading || usersInitialLoading) return true;

    if (isGroup) {
      return roomName.trim().length < 2 || selectedUsers.length === 0;
    }

    return selectedUsers.length !== 1;
  }, [isGroup, loading, usersInitialLoading, roomName, selectedUsers]);

  return (
    <>
      <div className={styless.overlay} onClick={onClose}>
        <div className={styless.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styless.header}>
            <div className={styless.title_box}>
              <div className={styless.icon}>
                {isGroup ? <Users size={20} /> : <UserRound size={20} />}
              </div>

              <div>
                <h2>
                  {isGroup ? "Yangi guruh yaratish" : "Yangi chat boshlash"}
                </h2>

                <p>
                  {isGroup
                    ? "Guruh uchun a'zolar tanlang"
                    : "Chat boshlash uchun foydalanuvchini tanlang"}
                </p>
              </div>
            </div>

            <button className={styless.close_btn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Group name */}
          {isGroup && (
            <div className={styless.input_box}>
              <label>Guruh nomi</label>

              <input
                type="text"
                placeholder="Guruh nomi kiriting..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
          )}

          {/* Users */}
          <div className={styless.users_wrapper}>
            <div className={styless.users_search_box}>
              <input
                type="search"
                placeholder="Foydalanuvchi qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <span className={styless.users_title}>Foydalanuvchilar</span>

            <div
              className={styless.users_list}
              ref={usersListRef}
              // onScroll endi olib tashlandi (pagination yo'q)
            >
              {usersInitialLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={styless.user_item_skeleton}>
                    <div className={styless.avatar_skeleton} />
                    <div className={styless.user_info_skeleton}>
                      <div className={styless.line_skeleton} />
                      <div className={styless.line_skeleton_short} />
                    </div>
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className={styless.empty_list}>
                  <p>Foydalanuvchi topilmadi.</p>
                  <span>
                    Yangi chat yoki guruh uchun foydalanuvchi mavjud emas.
                  </span>
                </div>
              ) : (
                users.map((user) => {
                  if (!user || user.id == null) {
                    return null;
                  }

                  const isSelected = selectedUsers.includes(user.id);
                  const displayName = user.full_name || "Noma'lum foydalanuvchi";
                  const avatarLetter = displayName?.[0] ?? "?";

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
                        {user.avatar ? (
                          <img src={user.avatar} alt={displayName} />
                        ) : (
                          avatarLetter
                        )}
                      </div>

                      <div className={styless.user_info}>
                        <strong>{displayName}</strong>
                        {/* Region va phone ma'lumotlari endi yo'q, shuning uchun olib tashlandi */}
                      </div>
                    </button>
                  );
                })
              )}

              {usersFetchingMore && (
                <div className={styless.users_list_footer}>
                  <span>Yuklanmoqda...</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styless.footer}>
            <button className={styless.cancel_btn} onClick={onClose}>
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