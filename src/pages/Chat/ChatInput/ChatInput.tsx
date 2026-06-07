import React, { useRef, useState, useEffect } from "react";
import { Image, FileText, X, Plus, Send, Mic } from "lucide-react";
import styless from "./ChatInput.module.scss";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";

interface ChatInputProps {
  message: string;
  attachment: File | null;
  uploadProgress: number | null;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onBlur: () => void;
  onAttachmentSelected: (file: File | null, error?: string) => void;
  onAttachmentClear: () => void;
  // Yangi prop - ovozli xabarni to'g'ridan-to'g'ri yuborish uchun
  onSendVoiceMessage?: (file: File) => Promise<void>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  attachment,
  uploadProgress,
  onMessageChange,
  onSendMessage,
  onBlur,
  onAttachmentSelected,
  onAttachmentClear,
  onSendVoiceMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(100, Math.max(40, textarea.scrollHeight));
    textarea.style.height = `${newHeight}px`;

    if (textarea.scrollHeight > 100) {
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.overflowY = "hidden";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  useEffect(() => {
    adjustTextareaHeight();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (message.trim() || attachment) {
        onSendMessage();
        setTimeout(() => adjustTextareaHeight(), 0);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMessageChange(e.target.value);
    adjustTextareaHeight();
  };

  // Voice recording complete - directly send the voice message
  const handleVoiceRecordingComplete = async (file: File) => {
    setShowVoiceRecorder(false);
    
    if (onSendVoiceMessage) {
      // Directly send voice message without adding to attachment
      await onSendVoiceMessage(file);
    } else {
      // Fallback: set as attachment and send
      onAttachmentSelected(file);
      setTimeout(() => {
        onSendMessage();
      }, 50);
    }
  };

  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  const handleVoiceClick = () => {
    setShowVoiceRecorder(true);
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();

          if (file.size > 10 * 1024 * 1024) {
            onAttachmentSelected(null, "Fayl hajmi 10MB dan oshmasligi kerak");
            return;
          }

          if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
          }

          onAttachmentSelected(file);
          break;
        }
      }
    }
  };

  // Handle Ctrl+V shortcut globally when textarea is focused
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const onPasteGlobal = (e: ClipboardEvent) => {
      if (document.activeElement === textarea) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();

              if (file.size > 10 * 1024 * 1024) {
                onAttachmentSelected(
                  null,
                  "Fayl hajmi 10MB dan oshmasligi kerak",
                );
                return;
              }

              if (file.type.startsWith("image/")) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
              }

              onAttachmentSelected(file);
              break;
            }
          }
        }
      }
    };

    document.addEventListener("paste", onPasteGlobal);
    return () => {
      document.removeEventListener("paste", onPasteGlobal);
    };
  }, [onAttachmentSelected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onAttachmentSelected(null, "Fayl hajmi 10MB dan oshmasligi kerak");
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    onAttachmentSelected(file);
  };

  const handleRemoveAttachment = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onAttachmentClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTimeout(() => adjustTextareaHeight(), 0);
  };

  const getFileIcon = () => {
    if (!attachment) return null;
    if (attachment.type.startsWith("image/")) {
      return <Image size={20} />;
    }
    if (attachment.type.startsWith("audio/")) {
      return <Mic size={20} />;
    }
    return <FileText size={20} />;
  };

  const getFileName = () => {
    if (!attachment) return "";
    if (attachment.type.startsWith("audio/")) {
      return "Ovozli xabar";
    }
    if (attachment.name.length > 30) {
      return attachment.name.substring(0, 27) + "...";
    }
    return attachment.name;
  };

  return (
    <div className={styless.chat_input_container}>
      {/* Voice Recorder - replaces input area when active */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleVoiceCancel}
        />
      ) : (
        <>
          {/* Attachment Preview */}
          {attachment && (
            <div className={styless.attachment_preview}>
              <div className={styless.attachment_preview_content}>
                {previewUrl ? (
                  <div className={styless.image_preview_wrapper}>
                    <img
                      src={previewUrl}
                      alt={attachment.name}
                      className={styless.image_preview}
                    />
                    <div className={styless.image_preview_overlay}>
                      <span className={styless.image_preview_name}>
                        {getFileName()}
                      </span>
                      {uploadProgress !== null && uploadProgress < 100 && (
                        <div className={styless.upload_progress}>
                          <div
                            className={styless.upload_progress_bar}
                            style={{ width: `${uploadProgress}%` }}
                          />
                          <span className={styless.upload_progress_text}>
                            {uploadProgress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styless.file_preview}>
                    {getFileIcon()}
                    <span className={styless.file_preview_name}>
                      {getFileName()}
                    </span>
                    {uploadProgress !== null && uploadProgress < 100 && (
                      <div className={styless.upload_progress}>
                        <div
                          className={styless.upload_progress_bar}
                          style={{ width: `${uploadProgress}%` }}
                        />
                        <span className={styless.upload_progress_text}>
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <button
                  className={styless.remove_attachment_btn}
                  onClick={handleRemoveAttachment}
                  title="Olib tashlash"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className={styless.input_area}>
            <button
              className={styless.attach_btn}
              onClick={() => fileInputRef.current?.click()}
              title="Fayl biriktirish (Ctrl+V)"
            >
              <Plus size={20} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx,.txt,audio/*"
              style={{ display: "none" }}
            />

            <textarea
              ref={textareaRef}
              className={styless.message_input}
              placeholder="Xabar yozing... (Ctrl+Enter yuborish)"
              value={message}
              onChange={handleChange}
              onBlur={onBlur}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <button
              className={styless.voice_btn}
              onClick={handleVoiceClick}
              title="Ovozli xabar yozish"
            >
              <Mic size={20} />
            </button>

            <button
              className={styless.send_btn}
              onClick={onSendMessage}
              disabled={!message.trim() && !attachment}
              title="Yuborish (Ctrl+Enter)"
            >
              <Send size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInput;