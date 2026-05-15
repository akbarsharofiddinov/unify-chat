import React from "react";
import { Header, Sidebar } from "../";
import styless from "./Layout.module.scss";
import { Outlet, useParams } from "react-router-dom";

const Layout: React.FC = () => {
  const { room_id } = useParams();

  return (
    <>
      <div className={styless.layout}>
        <Sidebar />
        <div className={styless.layout_content}>
          {room_id && (
            <Header />
          )}
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
