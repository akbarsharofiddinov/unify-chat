import React from "react";
import { Header, Sidebar } from "../";
import styless from "./Layout.module.scss";
import { Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <>
      <div className={styless.layout}>
        <Sidebar is_open={isSidebarOpen} />
        <div className={styless.layout_content}>
          <Header />
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
