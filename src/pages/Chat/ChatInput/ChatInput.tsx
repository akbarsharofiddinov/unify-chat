import React, { useCallback, useMemo } from "react";
import styless from "../ChatRoom.module.scss";
import { SendHorizonal, FileText, X } from "lucide-react";
import AttachmentButton, { MAX_ATTACHMENT_SIZE_BYTES } from "../AttachmentButton/AttachmentButton";

interface ChatInputProps {
  message: string;
  attachment: File | null;
  uploadProgress?: number | null;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onBlur: () => void;
  onAttachmentSelected: (file: File | null, error?: string) => void;
  onAttachmentClear: () => void;
}

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
};

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  attachment,
  uploadProgress,
  onMessageChange,
  onSendMessage,
  onBlur,
  onAttachmentSelected,
  onAttachmentClear,
}) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onMessageChange(event.target.value);
    },
    [onMessageChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSendMessage();
      }
    },
    [onSendMessage],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (!file) continue;

          event.preventDefault();

          if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            onAttachmentSelected(
              null,
              `Fayl hajmi ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024}MB dan oshmasligi kerak.`,
            );
            return;
          }

          onAttachmentSelected(file);
          return;
        }
      }
    },
    [onAttachmentSelected],
  );

  const attachmentPreviewUrl = useMemo(() => {
    if (!attachment) return null;
    if (attachment.type.startsWith("image/")) {
      return URL.createObjectURL(attachment);
    }
    return null;
  }, [attachment]);

  return (
    <div className={styless.chat_input_wrapper}>
      <AttachmentButton onFileSelected={onAttachmentSelected} />

      <div className={styless.chat_input_box}>
        {attachment && (
          <div className={styless.chat_attachment_preview}>
            {attachmentPreviewUrl ? (
              <div className={styless.chat_attachment_preview_thumb}>
                <img
                  src={attachmentPreviewUrl}
                  alt={attachment.name}
                  className={styless.chat_attachment_thumb_img}
                />
              </div>
            ) : (
              <div className={styless.chat_attachment_preview_icon}>
                <FileText size={18} />
              </div>
            )}
            <div className={styless.chat_attachment_preview_info}>
              <span className={styless.chat_attachment_preview_name}>
                {attachment.name}
              </span>
              <span className={styless.chat_attachment_preview_size}>
                {formatFileSize(attachment.size)}
              </span>
            </div>
            <button
              type="button"
              className={styless.chat_attachment_clear_btn}
              onClick={onAttachmentClear}
            >
              <X size={16} />
            </button>
            {typeof uploadProgress === "number" && (
              <div className={styless.chat_attachment_progress}>
                <div
                  className={styless.chat_attachment_progress_bar}
                  style={{ width: `${uploadProgress}%` }}
                />
                <div className={styless.chat_attachment_progress_text}>{uploadProgress}%</div>
              </div>
            )}
          </div>
        )}

        <textarea
          placeholder="Xabar yozing..."
          value={message}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
        />
      </div>

      <button
        className={styless.send_btn}
        onClick={onSendMessage}
        type="button"
      >
        <SendHorizonal size={20} />
      </button>
    </div>
  );
};

export default React.memo(ChatInput);
