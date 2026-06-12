// FilePreviewer.tsx (oddiy iframe bilan)
import React, { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { X, Download, Eye } from "lucide-react";

type Props = {
  file?: File;
  file_url?: string;
  download_file_url?: string;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function FilePreviewer({
  file,
  file_url,
  download_file_url,
  onClose,
  className,
  style,
}: Props) {
  const [url, setUrl] = useState<string>();
  const [officeViewerUrl, setOfficeViewerUrl] = useState<string>("");
  const [iframeError, setIframeError] = useState(false);

  const getFileNameFromUrl = (inputUrl: string) => {
    try {
      const urlObj = new URL(inputUrl);
      const pathname = urlObj.pathname;
      return pathname.split("/").pop() || "";
    } catch {
      const parts = inputUrl.split("/");
      const last = parts[parts.length - 1];
      return last.split("?")[0];
    }
  };

  const ext = useMemo(() => {
    let name = "";
    if (file) {
      name = file.name;
    } else if (file_url) {
      name = getFileNameFromUrl(file_url);
    }
    return name.split(".").pop()?.toLowerCase() || "";
  }, [file, file_url]);

  const isOfficeFile = useMemo(
    () => ["doc", "docx", "docm", "xls", "xlsx", "ppt", "pptx"].includes(ext),
    [ext],
  );

  const isPdfFile = useMemo(() => ext === "pdf", [ext]);
  const isImageFile = useMemo(
    () =>
      ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext),
    [ext],
  );
  const isTextFile = useMemo(
    () =>
      ["txt", "csv", "json", "md", "log", "html", "htm", "xml"].includes(ext),
    [ext],
  );

  // Microsoft Office Online Viewer URL
  const getMicrosoftOfficeViewerUrl = (fileUrl: string) => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  const handleDownload = () => {
    const downloadUrl = download_file_url || url;
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Blob URL yaratish
  useEffect(() => {
    setIframeError(false);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);

      if (isOfficeFile) {
        setOfficeViewerUrl(getMicrosoftOfficeViewerUrl(objectUrl));
      }

      return () => URL.revokeObjectURL(objectUrl);
    }

    if (file_url) {
      // To'liq URL yaratish
      const fullUrl = file_url.startsWith("http")
        ? file_url
        : `https://chat.m-gaz.uz${file_url}`;
      setUrl(fullUrl);

      if (isOfficeFile) {
        setOfficeViewerUrl(getMicrosoftOfficeViewerUrl(fullUrl));
      }
    }

    return undefined;
  }, [file, file_url, isOfficeFile]);

  // PDF preview - Google Docs Viewer
  if (isPdfFile && url) {
    // Google Docs Viewer URL
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              {file?.name || getFileNameFromUrl(file_url || "")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: "6px 12px",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                background: "#3b82f6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={16} />
              Yuklab olish
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Google Docs Viewer iframe */}
        <iframe
          src={googleViewerUrl}
          title="PDF Viewer"
          style={{ flex: 1, border: 0, width: "100%", height: "100%" }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
      </div>
    );
  }

  // Office fayllar (DOC, DOCX, XLS, XLSX, PPT, PPTX)
  if (isOfficeFile && officeViewerUrl) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f3f4f6",
          ...style,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              {file?.name || getFileNameFromUrl(file_url || "")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(download_file_url || url) && (
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #3b82f6",
                  borderRadius: 6,
                  background: "#3b82f6",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                }}
              >
                <Download size={16} />
                Yuklab olish
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Office Viewer iframe */}
        <iframe
          src={officeViewerUrl}
          title={file?.name || file_url || "Office document"}
          style={{
            flex: 1,
            width: "100%",
            border: "none",
            background: "white",
          }}
          allow="fullscreen"
        />
      </div>
    );
  }

  // Rasmlar
  if (isImageFile && url) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              {file?.name || getFileNameFromUrl(file_url || "")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: "6px 12px",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                background: "#3b82f6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={16} />
              Yuklab olish
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Image viewer */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
          }}
        >
          <img
            src={url}
            alt={file?.name || file_url || "image"}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    );
  }

  // Matnli fayllar
  if (isTextFile && file) {
    const [content, setContent] = useState<string>("");

    useEffect(() => {
      const reader = new FileReader();
      reader.onload = () => {
        setContent(String(reader.result ?? ""));
      };
      reader.readAsText(file);
    }, [file]);

    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              {file.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: "6px 12px",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                background: "#3b82f6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={16} />
              Yuklab olish
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <pre
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            margin: 0,
            background: "white",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          {content}
        </pre>
      </div>
    );
  }

  // Excel fayllar
  if (["xlsx", "xls"].includes(ext) && file) {
    const [html, setHtml] = useState<string>("");
    const xlsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(reader.result as ArrayBuffer), {
            type: "array",
          });
          const first = wb.Sheets[wb.SheetNames[0]];
          const htmlTable = XLSX.utils.sheet_to_html(first, {
            editable: false,
          });
          setHtml(htmlTable);
        } catch (error) {
          setHtml(`
            <div style="color:#dc2626;padding:12px">
              Excel ochilmadi: ${String(error)}
            </div>
          `);
        }
      };
      reader.readAsArrayBuffer(file);
    }, [file]);

    useEffect(() => {
      if (xlsRef.current && html) {
        xlsRef.current.innerHTML = html;
        xlsRef.current.querySelectorAll("td,th").forEach((el) => {
          (el as HTMLElement).style.border = "1px solid #e5e7eb";
          (el as HTMLElement).style.padding = "8px 12px";
          (el as HTMLElement).style.fontSize = "14px";
        });
      }
    }, [html]);

    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              {file.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: "6px 12px",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                background: "#3b82f6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={16} />
              Yuklab olish
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div
          ref={xlsRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            background: "white",
          }}
        />
      </div>
    );
  }

  // Fayl topilmadi
  if (!file && !url) {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>Fayl topilmadi</p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 16,
                padding: "6px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
              }}
            >
              Yopish
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default - yuklab olish taklifi
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid #e5e7eb",
          background: "white",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
            {file?.name || getFileNameFromUrl(file_url || "")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "white",
                color: "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#374151", marginBottom: 8, fontWeight: 500 }}>
            Preview mavjud emas
          </p>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            Fayl turi: {ext?.toUpperCase() || "Noma'lum"}
          </p>
          {url && (
            <button
              onClick={handleDownload}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Download size={16} />
              Yuklab olish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
