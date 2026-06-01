import React, { useEffect, useState, useMemo, useCallback } from "react";
import styless from "./ChatInfoModal.module.scss";
import {
  X,
  User,
  Users,
  Calendar,
  Shield,
  Phone,
  MapPin,
  Briefcase,
  Layers,
} from "lucide-react";
import { axiosAPI } from "@/service/axiosAPI";
import clsx from "clsx";

interface ChatInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomData: RoomData | null;
  currentUserInfo: any;
}

const ChatInfoModal: React.FC<ChatInfoModalProps> = ({
  isOpen,
  onClose,
  roomData,
  currentUserInfo,
}) => {
  const [loading, setLoading] = useState(false);
  const [userProfilesMap, setUserProfilesMap] = useState<Record<number, IUser>>({});
  const [error, setError] = useState<string | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Find companion for Direct Chat
  const companion = useMemo(() => {
    if (!roomData || roomData.type !== "direct" || !roomData.members) return null;
    return roomData.members.find((m) => m.user_id !== currentUserInfo?.id) || roomData.members[0];
  }, [roomData, currentUserInfo]);

  // Fetch profiles based on Room Type
  const fetchProfiles = useCallback(async () => {
    if (!roomData || !isOpen) return;

    setLoading(true);
    setError(null);
    setUserProfilesMap({});

    try {
      if (roomData.type === "direct") {
        if (companion) {
          const res = await axiosAPI.get(`https://v3.ekomplektasiya.uz/api/users/users/${companion.user_id}/`);
          if (res.status === 200) {
            setUserProfilesMap({ [companion.user_id]: res.data });
          }
        }
      } else {
        // Group Chat - load details for all members
        const membersList = roomData.members || [];
        const promises = membersList.map((m) =>
          axiosAPI
            .get(`https://v3.ekomplektasiya.uz/api/users/users/${m.user_id}/`)
            .then((res) => res.data as IUser)
            .catch((err) => {
              console.warn(`Failed to fetch profile for user ${m.user_id}:`, err);
              return null;
            })
        );

        const results = await Promise.all(promises);
        const map: Record<number, IUser> = {};
        results.forEach((user) => {
          if (user && user.id) {
            map[user.id] = user;
          }
        });
        setUserProfilesMap(map);
      }
    } catch (err: any) {
      console.error("Error loading chat details:", err);
      setError("Foydalanuvchi ma'lumotlarini yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }, [roomData, isOpen, companion]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Formatting helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return "A'zo";
    const r = role.toLowerCase();
    if (r === "owner") return "Egasining o'zi";
    if (r === "admin") return "Admin";
    return "A'zo";
  };

  if (!isOpen) return null;

  // Render Skeleton Loader
  const renderSkeleton = () => (
    <div className={styless.content}>
      <div className={styless.skeleton_hero}>
        <div className={clsx(styless.skeleton_avatar, styless.skeleton_shimmer)} />
        <div className={clsx(styless.skeleton_text_lg, styless.skeleton_shimmer)} />
        <div className={clsx(styless.skeleton_text_md, styless.skeleton_shimmer)} />
      </div>
      <div className={clsx(styless.skeleton_card, styless.skeleton_shimmer)} />
      <div className={styless.members_section}>
        <div className={clsx(styless.skeleton_text_md, styless.skeleton_shimmer)} style={{ width: "30%" }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styless.skeleton_item}>
            <div className={clsx(styless.skeleton_circle, styless.skeleton_shimmer)} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className={clsx(styless.skeleton_text_lg, styless.skeleton_shimmer)} style={{ width: "70%" }} />
              <div className={clsx(styless.skeleton_text_md, styless.skeleton_shimmer)} style={{ width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const directUser = companion ? userProfilesMap[companion.user_id] : null;

  return (
    <div className={styless.overlay} onClick={onClose}>
      <div className={styless.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styless.header}>
          <h2>{roomData?.type === "group" ? "Guruh ma'lumotlari" : "Chat ma'lumotlari"}</h2>
          <button className={styless.close_btn} onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          renderSkeleton()
        ) : !roomData ? (
          <div className={styless.empty_view}>
            <Users size={48} />
            <p>Ma'lumotlar topilmadi.</p>
          </div>
        ) : (
          <div className={styless.content}>
            {roomData.type === "direct" ? (
              /* DIRECT CHAT VIEW */
              <>
                <div className={styless.profile_hero}>
                  <div className={styless.avatar_large}>
                    {directUser?.photo_url ? (
                      <img src={directUser.photo_url} alt={roomData.name} className={styless.avatar_img} />
                    ) : (
                      companion?.fulle_name?.[0] || companion?.full_name?.[0] || "?"
                    )}
                  </div>
                  <h3 className={styless.display_name}>
                    {companion?.fulle_name || companion?.full_name || "Noma'lum"}
                  </h3>
                  {directUser?.username && (
                    <span className={styless.username}>@{directUser.username}</span>
                  )}
                  <span className={clsx(styless.status_badge, companion?.is_online ? styless.online : styless.offline)}>
                    <span className={styless.dot} />
                    {companion?.is_online ? "Online" : "Offline"}
                  </span>
                </div>

                <div className={styless.details_card}>
                  {directUser?.phone && (
                    <div className={styless.detail_item}>
                      <Phone size={18} className={styless.detail_icon} />
                      <div className={styless.detail_content}>
                        <span className={styless.label}>Telefon raqami</span>
                        <span className={styless.value}>{directUser.phone}</span>
                      </div>
                    </div>
                  )}

                  {directUser?.position && (
                    <div className={styless.detail_item}>
                      <Briefcase size={18} className={styless.detail_icon} />
                      <div className={styless.detail_content}>
                        <span className={styless.label}>Lavozimi</span>
                        <span className={styless.value}>{directUser.position}</span>
                      </div>
                    </div>
                  )}

                  {directUser?.department && (
                    <div className={styless.detail_item}>
                      <Layers size={18} className={styless.detail_icon} />
                      <div className={styless.detail_content}>
                        <span className={styless.label}>Bo'lim</span>
                        <span className={styless.value}>{directUser.department}</span>
                      </div>
                    </div>
                  )}

                  {(directUser?.region || directUser?.district) && (
                    <div className={styless.detail_item}>
                      <MapPin size={18} className={styless.detail_icon} />
                      <div className={styless.detail_content}>
                        <span className={styless.label}>Manzil</span>
                        <span className={styless.value}>
                          {[directUser.region, directUser.district].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>
                  )}

                  {companion?.created_at && (
                    <div className={styless.detail_item}>
                      <Calendar size={18} className={styless.detail_icon} />
                      <div className={styless.detail_content}>
                        <span className={styless.label}>A'zo bo'lgan sana</span>
                        <span className={styless.value}>{formatDate(companion.created_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* GROUP CHAT VIEW */
              <>
                <div className={styless.profile_hero}>
                  <div className={styless.avatar_large}>
                    {roomData.avatar ? (
                      <img src={roomData.avatar} alt={roomData.name} className={styless.avatar_img} />
                    ) : (
                      roomData.name?.[0] || "G"
                    )}
                  </div>
                  <h3 className={styless.display_name}>{roomData.name}</h3>
                  <span className={styless.username}>{roomData.members?.length || 0} ta a'zo</span>
                </div>

                <div className={styless.details_card}>
                  <div className={styless.detail_item}>
                    <Calendar size={18} className={styless.detail_icon} />
                    <div className={styless.detail_content}>
                      <span className={styless.label}>Yaratilgan sana</span>
                      <span className={styless.value}>{formatDate(roomData.created_at)}</span>
                    </div>
                  </div>

                  <div className={styless.detail_item}>
                    <User size={18} className={styless.detail_icon} />
                    <div className={styless.detail_content}>
                      <span className={styless.label}>Loyiha</span>
                      <span className={styless.value} style={{ textTransform: "capitalize" }}>
                        {roomData.project || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styless.members_section}>
                  <h4 className={styless.section_title}>Guruh A'zolari</h4>
                  {roomData.members && roomData.members.length > 0 ? (
                    roomData.members.map((member) => {
                      const profile = userProfilesMap[member.user_id];
                      return (
                        <div key={member.id} className={styless.member_item}>
                          <div className={styless.member_left}>
                            <div className={styless.member_avatar}>
                              {profile?.photo_url ? (
                                <img src={profile.photo_url} alt={member.fulle_name} className={styless.avatar_img} />
                              ) : (
                                member.fulle_name?.[0] || member.full_name?.[0] || "?"
                              )}
                            </div>
                            <div className={styless.member_info}>
                              <span className={styless.member_name}>
                                {member.fulle_name || member.full_name}
                                <span className={clsx(styless.status_dot, member.is_online && styless.online)} />
                              </span>
                              {profile?.username && (
                                <span className={styless.member_username}>@{profile.username}</span>
                              )}
                            </div>
                          </div>
                          <span className={clsx(styless.role_badge, styless[member.role?.toLowerCase() || "member"])}>
                            {formatRole(member.role)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
                      Guruhda a'zolar mavjud emas.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatInfoModal);
