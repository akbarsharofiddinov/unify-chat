import React from "react";
import styless from "./Sidebar.module.scss";
import { ChatMenu, SidebarHeader } from "./InnerComponents";

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <>
      <aside className={styless.sidebar}>
        <SidebarHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        {/* Sidebar content - Menu */}
        <ChatMenu />
      </aside>
    </>
  );
};

export default Sidebar;
