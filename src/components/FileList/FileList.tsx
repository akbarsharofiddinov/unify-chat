// components/FileList/FileList.tsx
import React from "react";
import {
  FileText,
  Download,
  Eye,
  Music,
  Archive,
  File,
  Image,
} from "lucide-react";
import clsx from "clsx";
import styles from "./FileList.module.scss";

interface FileItem {
  id: number;
  url: string;
  name?: string;
  size?: number;
  type?: string;
}

interface FileListProps {
  files: FileItem[];
  onPreview: (fileUrl: string, fileName: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
  isMyMessage: boolean;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico"].includes(
      ext,
    )
  ) {
    return Image;
  }
  if (["mp3", "wav", "ogg", "webm", "m4a", "flac"].includes(ext)) {
    return Music;
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return Archive;
  }
  if (
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "md",
      "rtf",
    ].includes(ext)
  ) {
    return FileText;
  }
  return File;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

const extractFileName = (url: string): string => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const fileName = decodedUrl.split("/").pop() || "Fayl";
    // Remove timestamp or random strings if needed
    return fileName.replace(/_[A-Za-z0-9]{7,}$/, "");
  } catch {
    return url.split("/").pop() || "Fayl";
  }
};

const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) return fileName;
  const ext = fileName.split(".").pop() || "";
  const name = fileName.slice(0, maxLength - ext.length - 3);
  return `${name}...${ext}`;
};

export const FileList: React.FC<FileListProps> = ({
  files,
  onPreview,
  onDownload,
  isMyMessage,
}) => {
  return (
    <div className={styles.file_list}>
      {files.map((file) => {
        const fileName = file.name || extractFileName(file.url);
        const truncatedName = truncateFileName(fileName);
        const FileIcon = getFileIcon(fileName);

        return (
          <div key={file.id} className={styles.file_item}>
            <div className={styles.file_icon}>
              <FileIcon size={18} />
            </div>

            <div className={styles.file_details}>
              <div className={styles.file_name} title={fileName}>
                {truncatedName}
              </div>
              {file.size && (
                <div className={styles.file_size}>
                  {formatFileSize(file.size)}
                </div>
              )}
            </div>

            <div className={styles.file_actions}>
              <button
                className={styles.file_action_btn}
                onClick={() => {
                  if(file.url.startsWith("/media/")) {
                  onPreview(file.url, fileName);
                  } else {
                    onPreview(`/media/${file.url}`, fileName);
                  }
                }}
                title="Ko'rish"
              >
                <Eye size={16} />
              </button>
              <button
                className={styles.file_action_btn}
                onClick={() => onDownload(file.url, fileName)}
                title="Yuklab olish"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
