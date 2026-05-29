import React, { useState } from "react";
import styless from "./TokenCostumizer.module.scss";
import { RefreshCcw } from "lucide-react";
import { Button, Modal } from "antd";

const TokenCostumizer: React.FC = () => {
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenTxt, setTokenTxt] = useState("");

  return (
    <>
      <button
        className={styless.token_button}
        onClick={() => setShowTokenModal(true)}
      >
        <RefreshCcw />
      </button>

      {showTokenModal && (
        <Modal
          open={showTokenModal}
          centered
          onCancel={() => setShowTokenModal(false)}
          title="Token almashtirish oyansi"
          footer={
            <div className={styless.modal_footer}>
              <Button
                onClick={() => {
                  setTokenTxt("");
                  setShowTokenModal(false);
                }}
              >
                Bekor qilish
              </Button>

              <Button
                type="primary"
                onClick={() => {
                  if (tokenTxt) {
                    localStorage.setItem("unify_chat_token", tokenTxt);
                    setTokenTxt("");
                    setShowTokenModal(false);
                  }
                }}
              >
                Qo'llash
              </Button>
            </div>
          }
        >
          <textarea
            className={styless.token_textarea}
            value={tokenTxt}
            onChange={(e) => setTokenTxt(e.target.value)}
          />
        </Modal>
      )}
    </>
  );
};

export default TokenCostumizer;
