import React from "react";
import styless from "./Sidebar.module.scss";
import { ChatMenu, SidebarHeader } from "./InnerComponents";

interface IProps {
  is_open: boolean;
}

const Sidebar: React.FC<IProps> = ({ is_open }) => {
  return (
    <>
      <aside className={styless.sidebar}>
        <SidebarHeader />
        {/* Sidebar content - Menu */}
        <ChatMenu />
      </aside>
    </>
  );
};

export default Sidebar;
