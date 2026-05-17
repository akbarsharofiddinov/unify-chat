import React from "react";
import styless from "./Sidebar.module.scss";
import { ChatMenu, SidebarHeader } from "./InnerComponents";
import { MessageSquarePlus, Users, UserPlus } from "lucide-react";
import { CreateRoomModal } from "@/components";

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = React.useState(false);
  const [newRoomType, setNewRoomType] = React.useState<roomType | null>(null);

  return (
    <>
      <aside className={styless.sidebar}>
        <SidebarHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Sidebar content */}
        <ChatMenu />

        {/* Create Room FAB */}
        <div className={styless.create_room_wrapper}>
          {/* Popup menu */}
          {isCreateMenuOpen && (
            <div className={styless.create_room_menu}>
              <button
                className={styless.create_room_menu_item}
                onClick={(e) => {
                  e.stopPropagation();
                  setNewRoomType((prev) =>
                    prev === "direct" ? null : "direct",
                  );
                }}
              >
                <UserPlus size={18} />
                <span>Yangi chat</span>
              </button>

              <button
                className={styless.create_room_menu_item}
                onClick={(e) => {
                  e.stopPropagation();
                  setNewRoomType((prev) => (prev === "group" ? null : "group"));
                }}
              >
                <Users size={18} />
                <span>Yangi guruh chat</span>
              </button>
            </div>
          )}

          {/* Main FAB */}
          <button
            className={styless.create_room_btn}
            onClick={() => {
              setIsCreateMenuOpen((prev) => !prev);
            }}
          >
            <MessageSquarePlus size={24} />
          </button>
        </div>
      </aside>

      {newRoomType && (
        <CreateRoomModal
          type={newRoomType}
          onClose={() => setNewRoomType(null)}
          onSuccess={() => setNewRoomType(null)}
        />
      )}
    </>
  );
};

export default Sidebar;
