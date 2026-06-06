import React from "react";
import { Sidebar } from "../";
import styless from "./Layout.module.scss";
import { Outlet } from "react-router-dom";
// import TokenCostumizer from "../TokenCostumizer/TokenCostumizer";

const Layout: React.FC = () => {

  return (
    <>
    <div className={styless.layout}>
        <Sidebar />
        <div className={styless.layout_content}>
          <main>
            <Outlet />
          </main>
        </div>
      </div>

      {/* <TokenCostumizer /> */}
    </>
  );
};

export default Layout;
