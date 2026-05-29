import React from "react";
import styless from "./SidebarHeader.module.scss";
import { Menu, RefreshCcw, Search } from "lucide-react";

interface IProps {
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onRefresh?: () => void;
}

const SidebarHeader: React.FC<IProps> = ({
  setIsSidebarOpen,
  onRefresh,
}) => {
  return (
    <>
      <div className={styless.sidebar_header}>
        <button
          className={styless.sidebar_header_menu_btn}
          onClick={() => {
            setIsSidebarOpen((prev) => !prev);
          }}
        >
          <Menu />
        </button>
        {/* Search input */}
        <div className={styless.sidebar_header_search}>
          <span className={styless.sidebar_header_search_icon}>
            <Search size={18} />
          </span>
          <input type="text" placeholder="Qidiruv..." />
        </div>

        <button onClick={onRefresh}>
          <RefreshCcw size={18} />
        </button>
      </div>
    </>
  );
};

export default SidebarHeader;
