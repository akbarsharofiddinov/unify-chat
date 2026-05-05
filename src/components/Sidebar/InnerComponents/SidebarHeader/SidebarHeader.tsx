import React from "react";
import styless from "./SidebarHeader.module.scss";
import { Menu, Search } from "lucide-react";

const SidebarHeader: React.FC = () => {
  return (
    <>
      <div className={styless.sidebar_header}>
        <button className={styless.sidebar_header_menu_btn}>
          <Menu />
        </button>
        {/* Search input */}
        <div className={styless.sidebar_header_search}>
          <span className={styless.sidebar_header_search_icon}>
            <Search size={18} />
          </span>
          <input type="text" placeholder="Search..." />
        </div>
      </div>
    </>
  );
};

export default SidebarHeader;
