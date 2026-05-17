import React from "react";
import emptyBg from "@/assets/empty-bg.png";
import styless from "./EmptyPage.module.scss";

const EmptyRoom: React.FC = () => {
  return (
    <div className={styless.container}>
      <div className={styless.content}>
        <img src={emptyBg} alt="" />
        <div className={styless.textWrapper}>
          <h2 className={styless.title}>Suhbat tanlanmagan</h2>
          <p className={styless.description}>
            Suhbatni boshlash uchun chap tomondan bironta chatni tanlang
          </p>
        </div>
      </div>
      <div className={styless.overlay} />
    </div>
  );
};

export default EmptyRoom;
