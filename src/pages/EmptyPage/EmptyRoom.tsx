import React from "react";
import emptyBg from "@/assets/empty-bg.png";
import styless from "./EmptyPage.module.scss";

const EmptyRoom: React.FC = () => {
  return (
    <>
      <div className={styless.container}>
        <img src={emptyBg} alt="" />
      </div>
    </>
  );
};

export default EmptyRoom;
