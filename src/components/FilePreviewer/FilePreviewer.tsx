// FilePreviewer.tsx (optimallashtirilgan versiya)
import React, { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { X } from "lucide-react";

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
    () => ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext),
    [ext],
  );
  const isTextFile = useMemo(
    () => ["txt", "csv", "json", "md", "log", "html", "htm"].includes(ext),
    [ext],
  );

  // Google Docs Viewer URL yaratish
  const getGoogleDocsViewerUrl = (fileUrl: string) => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
  };

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
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);

      // Office fayllar uchun viewer URL
      if (isOfficeFile) {
        setOfficeViewerUrl(getMicrosoftOfficeViewerUrl(objectUrl));
      }

      return () => URL.revokeObjectURL(objectUrl);
    }

    if (file_url) {
      setUrl(file_url);
      if (isOfficeFile) {
        // URL ni CORS muammosini hal qilish uchun proxy kerak bo'lishi mumkin
        setOfficeViewerUrl(getMicrosoftOfficeViewerUrl(file_url));
      }
    }

    return undefined;
  }, [file, file_url, isOfficeFile]);

  // PDF preview (iframe yoki react-pdf)
  if (isPdfFile && url) {
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
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
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
        <iframe
          title={file?.name || file_url || "PDF"}
          src={url}
          style={{ flex: 1, border: 0, width: "100%", height: "100%" }}
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
          <div style={{ flex: 1 }} />
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
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                📥 Yuklab olish
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

        {/* Viewer */}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
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
        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
          <img
            src={url}
            alt={file?.name || file_url || "image"}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
    );
  }

  // Matnli fayllar (fallback)
  const TextPreview = () => {
    const [content, setContent] = useState<string>("");
    const textRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setContent(String(reader.result ?? ""));
      };
      reader.readAsText(file);
    }, [file]);

    return (
      <pre
        ref={textRef}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          padding: 16,
          margin: 0,
          background: "white",
          fontFamily: "monospace",
          fontSize: 14,
          ...style,
        }}
      >
        {content}
      </pre>
    );
  };

  // Excel fayllar uchun alternativ (local preview)
  const ExcelPreview = () => {
    const [html, setHtml] = useState<string>("");
    const xlsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!file || !xlsRef.current) return;

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

        // Styling qo'shish
        xlsRef.current.querySelectorAll("td,th").forEach((el) => {
          (el as HTMLElement).style.border = "1px solid #e5e7eb";
          (el as HTMLElement).style.padding = "8px 12px";
          (el as HTMLElement).style.fontSize = "14px";
        });
      }
    }, [html]);

    return (
      <div
        ref={xlsRef}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          background: "white",
          padding: 16,
          ...style,
        }}
      />
    );
  };

  // Text fayllar
  if (isTextFile && !isOfficeFile) {
    return <TextPreview />;
  }

  // Excel fayllar (local fallback)
  if (["xlsx", "xls"].includes(ext) && !officeViewerUrl) {
    return <ExcelPreview />;
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
          flexDirection: "column",
          ...style,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
            flexShrink: 0,
          }}
        >
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
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <p>Fayl topilmadi.</p>
        </div>
      </div>
    );
  }

  // Default - download taklifi
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
          justifyContent: "flex-end",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid #e5e7eb",
          background: "white",
          flexShrink: 0,
        }}
      >
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 24,
            maxWidth: 400,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#374151", marginBottom: 8, fontWeight: 500 }}>
            Preview mavjud emas
          </p>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            Fayl turi: {ext?.toUpperCase() || "Noma'lum"}
          </p>
          {url && (
            <a
              href={url}
              download
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Faylni yuklab olish
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
