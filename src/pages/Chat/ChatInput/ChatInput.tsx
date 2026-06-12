import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Image,
  FileText,
  X,
  Plus,
  Send,
  Mic,
  Trash2,
  Download,
} from "lucide-react";
import styless from "./ChatInput.module.scss";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";

interface AttachmentFile {
  id: string; // Unique identifier for the file
  file: File;
  previewUrl: string | null;
  uploadProgress: number;
  error?: string;
}

interface ChatInputProps {
  message: string;
  attachments: AttachmentFile[]; // Changed from single file to array
  uploadProgress: number | null; // Kept for backward compatibility, but will use per-file progress
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onBlur: () => void;
  onAttachmentSelected: (files: File[] | null, error?: string) => void; // Changed to accept multiple files
  onAttachmentClear: () => void;
  onAttachmentRemove?: (fileId: string) => void; // New prop for removing individual file
  onSendVoiceMessage?: (file: File) => Promise<void>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  attachments,
  uploadProgress,
  onMessageChange,
  onSendMessage,
  onBlur,
  onAttachmentSelected,
  onAttachmentClear,
  onAttachmentRemove,
  onSendVoiceMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Generate unique ID for file
  const generateFileId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

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
      if (message.trim() || attachments.length > 0) {
        onSendMessage();
        setTimeout(() => adjustTextareaHeight(), 0);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMessageChange(e.target.value);
    adjustTextareaHeight();
  };

  // Process files and convert to AttachmentFile array
  const processFiles = useCallback(
    (files: FileList | File[]): AttachmentFile[] => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFiles: AttachmentFile[] = [];
      const errors: string[] = [];

      const fileArray = Array.from(files);

      // Limit to 10 files per message
      const limitedFiles = fileArray.slice(0, 10);

      if (fileArray.length > 10) {
        errors.push("Bir vaqtning o'zida maksimum 10 ta fayl yuklash mumkin");
      }

      for (const file of limitedFiles) {
        if (file.size > maxSize) {
          errors.push(`${file.name} - hajmi 10MB dan oshmasligi kerak`);
          continue;
        }

        let previewUrl: string | null = null;
        if (file.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(file);
        }

        validFiles.push({
          id: generateFileId(),
          file: file,
          previewUrl: previewUrl,
          uploadProgress: 0,
        });
      }

      if (errors.length > 0) {
        onAttachmentSelected([], errors.join(", "));
      }

      return validFiles;
    },
    [onAttachmentSelected],
  );

  // Handle file selection from input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const processedFiles = processFiles(files);
    if (processedFiles.length > 0) {
      onAttachmentSelected(processedFiles.map((f) => f.file));
    }

    // Clear input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const processedFiles = processFiles(files);
      if (processedFiles.length > 0) {
        onAttachmentSelected(processedFiles.map((f) => f.file));
      }
    }
  };

  // Voice recording complete
  const handleVoiceRecordingComplete = async (file: File) => {
    setShowVoiceRecorder(false);

    if (onSendVoiceMessage) {
      await onSendVoiceMessage(file);
    } else {
      // Treat as attachment
      const processedFiles = processFiles([file]);
      if (processedFiles.length > 0) {
        onAttachmentSelected(processedFiles.map((f) => f.file));
        setTimeout(() => {
          onSendMessage();
        }, 50);
      }
    }
  };

  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  const handleVoiceClick = () => {
    setShowVoiceRecorder(true);
  };

  // Handle paste event for multiple files
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const processedFiles = processFiles(files);
        if (processedFiles.length > 0) {
          onAttachmentSelected(processedFiles.map((f) => f.file));
        }
      }
    },
    [processFiles, onAttachmentSelected],
  );

  // Global paste event listener
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const onPasteGlobal = (e: ClipboardEvent) => {
      if (document.activeElement === textarea) {
        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              files.push(file);
            }
          }
        }

        if (files.length > 0) {
          e.preventDefault();
          const processedFiles = processFiles(files);
          if (processedFiles.length > 0) {
            onAttachmentSelected(processedFiles.map((f) => f.file));
          }
        }
      }
    };

    document.addEventListener("paste", onPasteGlobal);
    return () => {
      document.removeEventListener("paste", onPasteGlobal);
    };
  }, [processFiles, onAttachmentSelected]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image size={16} />;
    }
    if (file.type.startsWith("audio/")) {
      return <Mic size={16} />;
    }
    return <FileText size={16} />;
  };

  const getFileName = (file: File) => {
    if (file.type.startsWith("audio/")) {
      return "Ovozli xabar";
    }
    if (file.name.length > 25) {
      return file.name.substring(0, 22) + "...";
    }
    return file.name;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const handleRemoveFile = (fileId: string) => {
    if (onAttachmentRemove) {
      onAttachmentRemove(fileId);
    } else {
      // Find and revoke preview URL
      const attachment = attachments.find((a) => a.id === fileId);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      // If no onAttachmentRemove prop, we need to notify parent
      const remainingFiles = attachments
        .filter((a) => a.id !== fileId)
        .map((a) => a.file);
      if (remainingFiles.length === 0) {
        onAttachmentClear();
      } else {
        onAttachmentSelected(remainingFiles);
      }
    }
  };

  const handleClearAll = () => {
    // Revoke all preview URLs
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    onAttachmentClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const totalUploadProgress =
    attachments.length > 0
      ? attachments.reduce((sum, a) => sum + a.uploadProgress, 0) /
        attachments.length
      : uploadProgress;

  const hasUploading = attachments.some(
    (a) => a.uploadProgress > 0 && a.uploadProgress < 100,
  );

  return (
    <div
      className={`${styless.chat_input_container} ${isDragging ? styless.dragging : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Voice Recorder - replaces input area when active */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleVoiceCancel}
        />
      ) : (
        <>
          {/* Multiple Attachments Preview */}
          {attachments.length > 0 && (
            <div className={styless.attachments_preview}>
              <div className={styless.attachments_header}>
                <span className={styless.attachments_count}>
                  {attachments.length} ta fayl tanlangan
                </span>
                <button
                  className={styless.clear_all_btn}
                  onClick={handleClearAll}
                  title="Hammasini olib tashlash"
                >
                  <Trash2 size={14} />
                  <span>Hammasini tozalash</span>
                </button>
              </div>
              <div className={styless.attachments_grid}>
                {attachments.map((attachment) => (
                  <div key={attachment.id} className={styless.attachment_item}>
                    {attachment.previewUrl ? (
                      <div className={styless.image_preview_wrapper}>
                        <img
                          src={attachment.previewUrl}
                          alt={attachment.file.name}
                          className={styless.image_preview}
                        />
                        <div className={styless.image_preview_overlay}>
                          <span className={styless.image_preview_name}>
                            {getFileName(attachment.file)}
                          </span>
                          <span className={styless.file_size}>
                            {formatFileSize(attachment.file.size)}
                          </span>
                          {attachment.uploadProgress > 0 &&
                            attachment.uploadProgress < 100 && (
                              <div className={styless.upload_progress}>
                                <div
                                  className={styless.upload_progress_bar}
                                  style={{
                                    width: `${attachment.uploadProgress}%`,
                                  }}
                                />
                                <span className={styless.upload_progress_text}>
                                  {attachment.uploadProgress}%
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className={styless.file_preview}>
                        <div className={styless.file_icon}>
                          {getFileIcon(attachment.file)}
                        </div>
                        <div className={styless.file_info}>
                          <span className={styless.file_preview_name}>
                            {getFileName(attachment.file)}
                          </span>
                          <span className={styless.file_size}>
                            {formatFileSize(attachment.file.size)}
                          </span>
                        </div>
                        {attachment.uploadProgress > 0 &&
                          attachment.uploadProgress < 100 && (
                            <div className={styless.upload_progress}>
                              <div
                                className={styless.upload_progress_bar}
                                style={{
                                  width: `${attachment.uploadProgress}%`,
                                }}
                              />
                              <span className={styless.upload_progress_text}>
                                {attachment.uploadProgress}%
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                    <button
                      className={styless.remove_attachment_btn}
                      onClick={() => handleRemoveFile(attachment.id)}
                      title="Olib tashlash"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Global upload progress */}
              {hasUploading &&
                totalUploadProgress !== null &&
                totalUploadProgress > 0 && (
                  <div className={styless.global_upload_progress}>
                    <div
                      className={styless.global_upload_progress_bar}
                      style={{ width: `${totalUploadProgress}%` }}
                    />
                    <span className={styless.global_upload_progress_text}>
                      Yuklanmoqda... {Math.round(totalUploadProgress)}%
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Drag and drop overlay */}
          {isDragging && (
            <div className={styless.drag_overlay}>
              <div className={styless.drag_content}>
                <Plus size={48} />
                <p>Fayllarni shu yerga tashlang</p>
                <small>Maksimum 10 ta fayl, har biri 10MB gacha</small>
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
              multiple // Added multiple attribute
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
              disabled={!message.trim() && attachments.length === 0}
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
