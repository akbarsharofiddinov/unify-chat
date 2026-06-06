import { axiosAPI } from "@/service/axiosAPI";
import {
  parseTokenUserId,
  useChatWebSocket,
  type ServerSocketPayload,
} from "@/hooks/useChatWebSocket";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import { setCurrentChatData } from "@/store/slices/chatInfoSlice";
import {
  updateRoomUnreadCount,
  setRoomLastMessage,
} from "@/store/slices/chatRoomsSlice";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import styless from "./ChatRoom.module.scss";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  FileText,
  Info,
  Search,
  Trash2,
  Download,
} from "lucide-react";
import clsx from "clsx";
import { formatDateTime } from "@/utils/FormatDateTime";
import { getMessageStatus } from "@/utils/MessageStatus";
import { MessageStatusIcon } from "@/components/MessageStatusIcon";
import { ChatInfoModal } from "@/components";
import ChatInput from "./ChatInput/ChatInput";
import FilePreviewer from "@/components/FilePreviewer/FilePreviewer";
import { toast } from "react-toastify";

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
  "ico",
  "tiff",
  "tif",
  "heic",
  "heif",
];

const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.includes(ext);
};

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className: string;
  onClick?: () => void;
}

const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt,
  className,
  onClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={styless.image_skeleton_root}>
      {!loaded && !error && (
        <div className={styless.image_skeleton_shimmer} />
      )}
      {error ? (
        <div className={styless.image_skeleton_error}>
          <span>🖼️</span>
          <span>Rasm yuklanmadi</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={clsx(className, !loaded && styless.image_hidden)}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onClick={onClick}
          loading="lazy"
        />
      )}
    </div>
  );
};

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
};

const extractFileName = (message: MessageData) => {
  if (message.file?.name) {
    return message.file.name;
  }

  if (message.file_url) {
    try {
      return (
        new URL(message.file_url, window.location.origin).pathname
          .split("/")
          .pop() ?? "Fayl"
      );
    } catch {
      return message.file_url.split("/").pop() ?? "Fayl";
    }
  }

  return message.text || "Fayl";
};

const calculateIsMy = (message: MessageData, selfUserId: number | null) => {
  if (message.sender?.id != null && selfUserId != null) {
    return String(message.sender.id) === String(selfUserId);
  }

  return Boolean(message.is_my);
};

const ChatRoom: React.FC = () => {
  const [chatData, setChatData] = useState<RoomData | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<string>("");

  // Upward infinite scroll pagination states
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreUp, setHasMoreUp] = useState(false);

  // Upward infinite scroll pagination refs
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  // Cursor: the smallest message id currently loaded; used to fetch older messages
  const oldestMessageIdRef = useRef<number | null>(null);
  const isLoadingOlderMessagesRef = useRef<boolean>(false);
  // Prevent fetching the same cursor twice in a row
  const lastFetchedOldestIdRef = useRef<number | null>(null);
  const scrollSnapshotRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const initialLoadCompleteRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typingUsers, setTypingUsers] = useState<MembarData[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<number>>(
    new Set(),
  );
  const pendingMessageSignaturesRef = useRef<
    Record<number, { text: string; created_at: string }>
  >({});

  const { room_id } = useParams();
  const dispatch = useAppDispatch();
  const selfUserId = useMemo(
    () => parseTokenUserId(localStorage.getItem("unify_chat_token")),
    [],
  );

  const readSentRef = useRef<Set<number>>(new Set());
  const typingTimersRef = useRef<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousLastMessageId = useRef<number | null>(null);

  const normalizeMessage = useCallback(
    (message: MessageData) => ({
      ...message,
      is_my: calculateIsMy(message, selfUserId),
      file: message.file ?? null,
      file_url: message.file_url ?? null,
      reply_to: message.reply_to ?? null,
      reads: message.reads ?? [],
      is_edited: Boolean((message as any).is_edited),
    }),
    [selfUserId],
  );

  const upsertMessage = useCallback(
    (incoming: MessageData) => {
      const normalized = normalizeMessage(incoming);

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === normalized.id,
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...normalized };
          return updated;
        }

        const normalizeText = (t?: string) =>
          (t ?? "").trim().replace(/\s+/g, " ").toLowerCase();

        const pendingIndex = prev.findIndex((item) => {
          if (!item.is_my) return false;
          const signature = pendingMessageSignaturesRef.current[item.id];
          if (!signature) return false;

          const sigText = normalizeText(signature.text);
          const msgText = normalizeText(normalized.text);

          // Allow match when normalized texts are equal or one contains the other (minor server-side changes)
          const textMatches =
            sigText === msgText ||
            sigText.startsWith(msgText) ||
            msgText.startsWith(sigText);
          if (!textMatches) return false;

          const localTime = new Date(signature.created_at).getTime();
          const serverTime = new Date(normalized.created_at).getTime();

          // Increase tolerance to 30s to account for clock differences / processing delays
          return Math.abs(localTime - serverTime) <= 30000;
        });

        if (pendingIndex >= 0) {
          const pendingId = prev[pendingIndex].id;
          setPendingMessageIds((pending) => {
            const updated = new Set(pending);
            updated.delete(pendingId);
            return updated;
          });
          delete pendingMessageSignaturesRef.current[pendingId];

          const updated = [...prev];
          updated[pendingIndex] = { ...updated[pendingIndex], ...normalized };
          return updated.sort(
            (left, right) =>
              new Date(left.created_at).getTime() -
              new Date(right.created_at).getTime(),
          );
        }

        return [...prev, normalized].sort(
          (left, right) =>
            new Date(left.created_at).getTime() -
            new Date(right.created_at).getTime(),
        );
      });

      // Update the room's last_message in the sidebar only for real
      // (server-confirmed) messages — skip optimistic/pending ones (negative id).
      if (normalized.id > 0 && room_id) {
        dispatch(
          setRoomLastMessage({
            roomId: Number(room_id),
            last_message: {
              id: normalized.id,
              text: normalized.text,
              type: normalized.type,
              sender: normalized.sender,
              created_at: normalized.created_at,
            },
          }),
        );
      }
    },
    [normalizeMessage, pendingMessageIds, dispatch, room_id],
  );

  const updateMessageReads = useCallback(
    (messageId: number, user: MembarData) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const hasReader = msg.reads?.some((read) => read.user.id === user.id);
          if (hasReader) return msg;

          return {
            ...msg,
            reads: [
              ...(msg.reads ?? []),
              { user, read_at: new Date().toISOString() },
            ],
          };
        }),
      );
    },
    [],
  );

  const markMessageDeleted = useCallback((messageId: number) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id !== messageId
          ? msg
          : {
            ...msg,
            text: "Xabar o'chirildi",
            type: "text",
            reply_to: null,
            reads: msg.reads ?? [],
          },
      ),
    );
  }, []);

  const reportTypingUser = useCallback(
    (user: MembarData, isTyping: boolean) => {
      setTypingUsers((prev) => {
        const exists = prev.some((item) => item.id === user.id);
        if (isTyping) {
          if (exists) return prev;
          return [...prev, user];
        }
        return prev.filter((item) => item.id !== user.id);
      });
    },
    [],
  );

  const clearTypingTimer = useCallback((userId: number | string) => {
    const key = String(userId);
    if (typingTimersRef.current[key]) {
      window.clearTimeout(typingTimersRef.current[key]);
      delete typingTimersRef.current[key];
    }
  }, []);

  const sendReadRef = useRef<(messageId: number) => boolean>(() => false);

  const handleServerEvent = useCallback(
    (event: ServerSocketPayload) => {
      switch (event.type) {
        case "message":
          upsertMessage(event.message);

          if (!calculateIsMy(event.message, selfUserId)) {
            const id = event.message.id;
            if (!readSentRef.current.has(id)) {
              sendReadRef.current(id);
              readSentRef.current.add(id);
            }
          }
          break;

        case "read":
          updateMessageReads(event.message_id, event.user);
          break;

        case "typing": {
          clearTypingTimer(event.user_id.id);
          if (event.is_typing) {
            reportTypingUser(event.user_id, true);
            typingTimersRef.current[String(event.user_id.id)] =
              window.setTimeout(() => {
                reportTypingUser(event.user_id, false);
                clearTypingTimer(event.user_id.id);
              }, 3000);
          } else {
            reportTypingUser(event.user_id, false);
          }
          break;
        }

        case "deleted":
          markMessageDeleted(event.message_id);
          break;

        case "updated":
          upsertMessage(event.message);
          break;

        case "error":
          setSendError(event.detail);
          break;

        default:
          break;
      }
    },
    [
      clearTypingTimer,
      markMessageDeleted,
      reportTypingUser,
      selfUserId,
      updateMessageReads,
      upsertMessage,
    ],
  );

  const {
    status,
    lastError,
    isConnected,
    sendMessage: socketSendMessage,
    sendTyping: socketSendTyping,
    sendRead,
    sendDelete,
    sendUpdate,
    sendFileId: socketSendFileId,
  } = useChatWebSocket(room_id, handleServerEvent);

  sendReadRef.current = sendRead;

  const { currentUserInfo } = useAppSelector((state) => state.chatInfo);

  const fetchRoomData = useCallback(async () => {
    try {
      const response = await axiosAPI.get(`room/${room_id}/`);
      if (response.status === 200) {
        setChatData(response.data);
        dispatch(setCurrentChatData(response.data));
      }
    } catch (error) {
      console.error(error);
    }
  }, [room_id]);

  const fetchMessages = useCallback(async () => {
    if (!room_id) return;

    try {
      setLoadingMessages(true);

      // Reset pagination states before loading new room messages
      oldestMessageIdRef.current = null;
      lastFetchedOldestIdRef.current = null;
      setHasMoreUp(false);
      scrollSnapshotRef.current = null;
      initialLoadCompleteRef.current = false;

      const response = await axiosAPI.get<{
        results: MessageData[];
        pagination: {
          has_more_up: boolean;
          has_more_down: boolean;
          first_id: number;
          last_id: number;
          count: number;
        };
      }>(`room/${room_id}/messages/?limit=10`);

      if (response.status === 200) {
        const sorted = response.data.results
          .map((item: MessageData) => normalizeMessage(item))
          .sort(
            (left: MessageData, right: MessageData) =>
              new Date(left.created_at).getTime() -
              new Date(right.created_at).getTime(),
          );
        setMessages(sorted);

        // Store the oldest message id as the cursor for loading older pages
        const pagination = response.data.pagination;
        oldestMessageIdRef.current = pagination?.first_id ?? null;
        setHasMoreUp(Boolean(pagination?.has_more_up));
        initialLoadCompleteRef.current = true;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMessages(false);
    }
  }, [room_id, normalizeMessage]);

  const handleDownload = async (fileUrl: string) => {
    if (!fileUrl) {
      toast.error("Fayl manzili topilmadi");
      return;
    }
    try {
      const response = await fetch(`https://chat.m-gaz.uz${fileUrl}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileUrl.split(".")[1];
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("Network response was not ok");
      }
    } catch (error) {
      console.log(error);
      toast.error("Faylni yuklab olishda xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (room_id) {
      Promise.resolve().then(() => {
        fetchRoomData();
        fetchMessages();
        setTypingUsers([]);
        setEditingMessageId(null);
        setEditingText("");
        setSendError(null);
      });
      readSentRef.current.clear();
      previousLastMessageId.current = null;
    }
    setFilePreview("");
  }, [room_id, fetchRoomData, fetchMessages]);

  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id ?? null;
    if (lastMessageId == null) return;

    if (previousLastMessageId.current !== lastMessageId) {
      previousLastMessageId.current = lastMessageId;
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages]);

  // Load older messages using cursor-based pagination (before_id)
  const loadOlderMessages = useCallback(async () => {
    const beforeId = oldestMessageIdRef.current;

    // No cursor means we haven't loaded initial messages yet or already at the top
    if (!beforeId) return;

    // Already in-flight
    if (isLoadingOlderMessagesRef.current) return;

    // Guard: same cursor was just fetched – don't repeat
    if (lastFetchedOldestIdRef.current === beforeId) return;

    // Acquire loading lock
    isLoadingOlderMessagesRef.current = true;
    lastFetchedOldestIdRef.current = beforeId;
    setIsLoadingOlderMessages(true);

    // Snapshot scroll position so we can restore it after prepending messages
    const container = chatMessagesRef.current;
    if (container) {
      scrollSnapshotRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    }

    try {
      const response = await axiosAPI.get<{
        results: MessageData[];
        pagination: {
          has_more_up: boolean;
          has_more_down: boolean;
          first_id: number;
          last_id: number;
          count: number;
        };
      }>(`room/${room_id}/messages/?before_id=${beforeId}&limit=10`);

      if (response.status === 200) {
        const pagination = response.data.pagination;
        const fetchedMessages = response.data.results
          .map((item) => normalizeMessage(item))
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

        if (fetchedMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((msg) => msg.id));
            const uniqueNew = fetchedMessages.filter(
              (msg) => !existingIds.has(msg.id),
            );
            if (uniqueNew.length === 0) return prev;
            return [...uniqueNew, ...prev].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          });

          // Update cursor to the oldest id in this new batch
          oldestMessageIdRef.current = pagination?.first_id ?? null;
          setHasMoreUp(Boolean(pagination?.has_more_up));
        } else {
          // Empty result – reached the very beginning
          setHasMoreUp(false);
          oldestMessageIdRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
      scrollSnapshotRef.current = null;
      // Reset the guard so a retry is possible
      lastFetchedOldestIdRef.current = null;
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [room_id, normalizeMessage]);

  // Synchronously restore scroll position before browser repaints
  useLayoutEffect(() => {
    if (scrollSnapshotRef.current && chatMessagesRef.current) {
      const container = chatMessagesRef.current;
      const { scrollHeight, scrollTop } = scrollSnapshotRef.current;

      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeight;

      // Adjust scrollTop relative to the height difference of prepended messages
      container.scrollTop = scrollTop + heightDifference;

      console.log("Restored scroll position:", {
        oldHeight: scrollHeight,
        newHeight: newScrollHeight,
        difference: heightDifference,
        newScrollTop: container.scrollTop,
      });

      // Clean up snapshotted state
      scrollSnapshotRef.current = null;
    }
  }, [messages]);

  // Monitor scroll position to trigger loading older messages when near the top
  const handleScroll = useCallback(() => {
    const container = chatMessagesRef.current;
    if (!container || !initialLoadCompleteRef.current) return;

    // Debounce scroll handling
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      // Trigger when within 80px of the top of the scroll container
      const isNearTop = container.scrollTop <= 80;

      if (
        isNearTop &&
        hasMoreUp &&
        oldestMessageIdRef.current !== null &&
        !isLoadingOlderMessagesRef.current
      ) {
        loadOlderMessages();
      }
    }, 150);
  }, [loadOlderMessages, hasMoreUp]);

  // Clean up scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Find messages matching search query
  const matchedMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.text &&
        msg.text !== "Xabar o'chirildi" &&
        msg.text.toLowerCase().includes(query),
    );
  }, [messages, searchQuery]);

  // Default to last match (most recent) when matches change
  useEffect(() => {
    Promise.resolve().then(() => {
      if (matchedMessages.length > 0) {
        setCurrentMatchIndex(matchedMessages.length - 1);
      } else {
        setCurrentMatchIndex(-1);
      }
    });
  }, [matchedMessages]);

  // Scroll to active match
  useEffect(() => {
    if (currentMatchIndex >= 0 && matchedMessages[currentMatchIndex]) {
      const activeId = matchedMessages[currentMatchIndex].id;
      const element = document.getElementById(`msg-${activeId}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentMatchIndex, matchedMessages]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchInput("");
    setSearchQuery("");
    setCurrentMatchIndex(-1);
  }, []);

  const handlePrevMatch = useCallback(() => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev <= 0 ? matchedMessages.length - 1 : prev - 1,
    );
  }, [matchedMessages]);

  const handleNextMatch = useCallback(() => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev >= matchedMessages.length - 1 ? 0 : prev + 1,
    );
  }, [matchedMessages]);

  const renderHighlightedText = useCallback(
    (text: string, query: string, isActive: boolean) => {
      if (!query.trim() || text === "Xabar o'chirildi") {
        return text;
      }
      const escapedQuery = query.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = text.split(regex);

      return parts.map((part, idx) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark
            key={idx}
            className={clsx(
              styless.highlight,
              isActive && styless.highlight_active,
            )}
          >
            {part}
          </mark>
        ) : (
          part
        );
      });
    },
    [],
  );

  useEffect(() => {
    if (!isConnected || !selfUserId || !room_id) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          !msg.reads?.some(
            (read) => String(read.user.id) === String(selfUserId),
          ) &&
          !readSentRef.current.has(msg.id) &&
          !pendingMessageIds.has(msg.id),
      )
      .map((msg) => msg.id);

    if (unreadIds.length > 0) {
      dispatch(
        updateRoomUnreadCount({ roomId: Number(room_id), unread_count: 0 }),
      );
    }

    unreadIds.forEach((id) => {
      sendRead(id);
      readSentRef.current.add(id);
    });
  }, [
    dispatch,
    isConnected,
    messages,
    room_id,
    sendRead,
    selfUserId,
    pendingMessageIds,
  ]);

  const handleInputChange = useCallback(
    (value: string) => {
      setMessage(value);
      if (!value.trim()) {
        socketSendTyping(false);
        return;
      }
      socketSendTyping(true);
    },
    [socketSendTyping],
  );

  const handleInputBlur = useCallback(() => {
    socketSendTyping(false);
  }, [socketSendTyping]);

  const handleAttachmentSelected = useCallback(
    (file: File | null, error?: string) => {
      if (error) {
        setSendError(error);
        return;
      }
      setSendError(null);
      setSelectedFile(file);
    },
    [],
  );

  const handleAttachmentClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && !selectedFile) return;

    setSendError(null);

    const tempId = -Date.now();
    const createdAt = new Date().toISOString();
    const optimisticMessage: MessageData = {
      id: tempId,
      type: selectedFile ? "file" : "text",
      text: selectedFile ? selectedFile.name : message,
      is_my: true,
      sender: {
        id: selfUserId || 0,
        full_name: "You",
        avatar: null,
      },
      reads: [],
      is_edited: false,
      file: selectedFile,
      file_url: null,
      reply_to: null,
      created_at: createdAt,
    };

    upsertMessage(optimisticMessage);
    pendingMessageSignaturesRef.current[tempId] = {
      text: optimisticMessage.text.trim(),
      created_at: createdAt,
    };

    setPendingMessageIds((prev) => new Set([...prev, tempId]));

    let wasSent = false;
    if (selectedFile) {
      setUploadProgress(0);

      try {
        if (!isConnected) {
          throw new Error("Realtime connection is not available.");
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await axiosAPI.post("upload/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        });

        const fileId = response.data?.id ?? response.data?.file_id ?? null;
        if (fileId == null) {
          throw new Error("Upload response did not return a file ID.");
        }

        wasSent = socketSendFileId(fileId);
        setUploadProgress((prev) => (wasSent ? 100 : prev));
      } catch (error) {
        console.error("File upload failed", error);
        wasSent = false;
      }
    } else {
      wasSent = socketSendMessage(message);
    }

    if (!wasSent) {
      setSendError(
        "Xabarni jo'nata olmadik. Iltimos, tarmoqqa ulanganingizni tekshiring.",
      );
      setPendingMessageIds((prev) => {
        const updated = new Set(prev);
        updated.delete(tempId);
        return updated;
      });
      delete pendingMessageSignaturesRef.current[tempId];
      setUploadProgress(null);
      return;
    }

    setMessage("");
    setSelectedFile(null);
    setUploadProgress(null);
    socketSendTyping(false);
  }, [
    message,
    selectedFile,
    selfUserId,
    socketSendMessage,
    socketSendTyping,
    socketSendFileId,
    upsertMessage,
    isConnected,
  ]);

  const handleDelete = (messageId: number) => {
    if (!window.confirm("Xabarni o'chirmoqchimisiz?")) return;
    if (!sendDelete(messageId)) {
      setSendError("O'chirish uchun ulanish mavjud emas.");
    }
  };

  const handleEditStart = (messageId: number, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleEditSave = () => {
    if (editingMessageId === null || !editingText.trim()) return;
    if (!sendUpdate(editingMessageId, editingText)) {
      setSendError("Yangilanish uchun ulanish mavjud emas.");
      return;
    }
    setEditingMessageId(null);
    setEditingText("");
  };

  const roomTitle = useMemo(() => {
    if (!chatData) return "Chat";

    if (chatData.type === "group") {
      return chatData.name;
    }

    const companion = (chatData.members as any[])?.find(
      (member) => member.user_id !== currentUserInfo.id,
    ) as any;
    return companion?.fulle_name || companion?.full_name || "Shaxsiy chat";
  }, [chatData, currentUserInfo]);

  const typingLabel = useMemo(() => {
    if (!typingUsers.length) return null;
    if (typingUsers.length === 1) return "Yozmoqda";
    return `${typingUsers.length} kishi yozmoqda`;
  }, [typingUsers]);

  const statusLabel = useMemo(() => {
    if (status === "connecting") return "Ulanmoqda...";
    if (status === "reconnecting") return "Qayta ulanmoqda...";
    if (status === "auth_failed") return "Token yaroqsiz yoki yo'q.";
    if (status === "forbidden") return "Siz bu xonada a'zo emassiz.";
    if (status === "error") return lastError || "Ulanishda xato yuz berdi.";

    if (chatData?.type === "group") {
      return `${chatData?.members?.length || 0} a'zo`;
    }

    const companion = (chatData?.members as any[])?.find(
      (member) => !member.is_me,
    ) as any;
    if (!companion) return "Offline";
    return companion.is_online ? "Online" : "Offline";
  }, [chatData, lastError, status]);

  const headerStatus = typingLabel || statusLabel;

  const navigate = useNavigate();

  return (
    <>
      <div className={styless.chat_room}>
        <header className={styless.chat_header}>
          {isSearchOpen ? (
            <div className={styless.search_header_container}>
              <button
                className={styless.search_close_btn}
                onClick={handleCloseSearch}
                title="Qidiruvni yopish"
              >
                <ArrowLeft size={20} />
              </button>
              <div className={styless.search_input_wrapper}>
                <input
                  type="text"
                  placeholder="Xabarlarni qidirish..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={styless.search_input}
                  autoFocus
                />
              </div>
              {matchedMessages.length > 0 && (
                <div className={styless.search_nav}>
                  <span className={styless.search_count}>
                    {currentMatchIndex + 1} / {matchedMessages.length}
                  </span>
                  <button
                    onClick={handlePrevMatch}
                    className={styless.search_nav_btn}
                    title="Oldingi"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className={styless.search_nav_btn}
                    title="Keyingi"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              )}
              {searchInput.trim() !== "" && matchedMessages.length === 0 && (
                <span className={styless.no_results}>Natija topilmadi</span>
              )}
            </div>
          ) : (
            <>
              <div className={styless.chat_header_left}>
                <button
                  className={styless.back_button}
                  onClick={() => {
                    dispatch(setCurrentChatData(null));
                    navigate("/");
                  }}
                >
                  <ArrowLeft />
                </button>
                <div className={styless.chat_avatar}>{roomTitle?.[0]}</div>

                <div className={styless.chat_info}>
                  <h2>{roomTitle}</h2>
                  <span className={styless.chat_status}>
                    {headerStatus}
                    {typingLabel && (
                      <span className={styless.chat_status_dots}>
                        <span className={styless.chat_status_dot} />
                        <span className={styless.chat_status_dot} />
                        <span className={styless.chat_status_dot} />
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className={styless.chat_header_actions}>
                <button onClick={() => setIsSearchOpen(true)} title="Qidirish">
                  <Search size={20} />
                </button>
                <button
                  onClick={() => setIsInfoModalOpen(true)}
                  title="Guruh/Chat ma'lumotlari"
                >
                  <Info size={20} />
                </button>
              </div>
            </>
          )}
        </header>

        {filePreview ? (
          <FilePreviewer
            file_url={`https://chat.m-gaz.uz${filePreview}`}
            onClose={() => setFilePreview("")}
          />
        ) : (
          <>
            <div
              className={styless.chat_messages}
              ref={chatMessagesRef}
              onScroll={handleScroll}
            >
              {isLoadingOlderMessages && (
                <div className={styless.loading_text}>
                  Eski xabarlar yuklanmoqda...
                </div>
              )}

              {hasMoreUp && !isLoadingOlderMessages && (
                <div className={styless.load_more_container}>
                  <button
                    className={styless.load_more_btn}
                    onClick={loadOlderMessages}
                  >
                    Eski xabarlarni yuklash
                  </button>
                </div>
              )}

              <div className={styless.messages_date}>
                <span>Bugun</span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={clsx(
                    styless.message_wrapper,
                    msg.is_my
                      ? styless.message_wrapper_me
                      : styless.message_wrapper_other,
                  )}
                >
                  <div
                    className={clsx(
                      styless.message,
                      msg.is_my ? styless.message_me : styless.message_other,
                      msg.text === "Xabar o'chirildi" &&
                      styless.message_deleted,
                    )}
                  >
                    {!msg.is_my && (
                      <span className={styless.message_sender}>
                        {msg.sender?.full_name}
                      </span>
                    )}

                    {editingMessageId === msg.id ? (
                      <div className={styless.message_edit_form}>
                        <textarea
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(event.target.value)
                          }
                          className={styless.message_edit_textarea}
                          rows={2}
                        />
                        <div className={styless.message_actions}>
                          <button
                            className={styless.message_action_button}
                            type="button"
                            onClick={handleEditSave}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className={styless.message_action_button}
                            type="button"
                            onClick={handleEditCancel}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.type === "file" ? (() => {
                          const fileName = extractFileName(msg);
                          const isImage = isImageFile(fileName);
                          const imageUrl = msg.file_url
                            ? `https://chat.m-gaz.uz${msg.file_url}`
                            : msg.file instanceof File && isImage
                              ? URL.createObjectURL(msg.file)
                              : null;

                          if (isImage && imageUrl) {
                            return (
                              <div className={styless.image_message_wrapper}>
                                <div className={styless.image_message_container}>
                                  <ImageWithSkeleton
                                    src={imageUrl}
                                    alt={fileName}
                                    className={styless.image_message_preview}
                                    onClick={() => {
                                      if (msg.file_url) {
                                        setFilePreview(msg.file_url);
                                      }
                                    }}
                                  />
                                  {msg.file_url && (
                                    <button
                                      className={styless.image_download_btn}
                                      title="Yuklab olish"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(msg.file_url!);
                                      }}
                                    >
                                      <Download size={14} />
                                    </button>
                                  )}
                                </div>
                                <div className={styless.image_message_name}>
                                  {fileName}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className={styless.file_message_card}>
                              <div className={styless.file_message_card_meta}>
                                <div className={styless.file_message_card_info}>
                                  <span
                                    className={styless.file_message_card_icon}
                                  >
                                    <FileText size={18} />
                                  </span>
                                  <div>
                                    <div
                                      className={styless.file_message_card_name}
                                    >
                                      {fileName}
                                    </div>
                                    {msg.file?.size ? (
                                      <div
                                        className={styless.file_message_card_size}
                                      >
                                        {formatFileSize(msg.file.size)}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div
                                  className={styless.file_message_card_actions}
                                >
                                  {msg.file_url ? (
                                    <button
                                      className={styless.file_message_card_button}
                                      onClick={() => {
                                        if (msg.file_url) {
                                          setFilePreview(msg.file_url);
                                        }
                                      }}
                                    >
                                      <Eye size={16} />
                                    </button>
                                  ) : null}
                                  {msg.file_url ? (
                                    <button
                                      className={styless.file_message_card_button}
                                      title="Yuklab olish"
                                      onClick={() => {
                                        handleDownload(msg.file_url!);
                                      }}
                                    >
                                      <Download size={16} />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })() : (
                          <p
                            className={
                              msg.text === "Xabar o'chirildi"
                                ? styless.deleted_text
                                : ""
                            }
                          >
                            {renderHighlightedText(
                              msg.text,
                              searchQuery,
                              matchedMessages[currentMatchIndex]?.id === msg.id,
                            )}
                          </p>
                        )}
                        <div className={styless.message_footer}>
                          <span className={styless.message_time}>
                            {formatDateTime(msg.created_at)}
                          </span>
                          {msg.is_edited && (
                            <span className={styless.message_edited}>
                              (tahrirlandi)
                            </span>
                          )}
                          {msg.is_my && (
                            <MessageStatusIcon
                              status={getMessageStatus(
                                msg.id,
                                pendingMessageIds.has(msg.id),
                                msg.reads?.length ?? 0,
                              )}
                            />
                          )}
                        </div>
                      </>
                    )}

                    {msg.is_my &&
                      editingMessageId !== msg.id &&
                      msg.text !== "Xabar o'chirildi" && (
                        <div className={styless.message_actions}>
                          <button
                            className={styless.message_action_button}
                            type="button"
                            onClick={() => handleEditStart(msg.id, msg.text)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className={styless.message_action_button}
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {loadingMessages && (
                <div className={styless.loading_text}>Yuklanmoqda...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              message={message}
              attachment={selectedFile}
              uploadProgress={uploadProgress}
              onMessageChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onBlur={handleInputBlur}
              onAttachmentSelected={handleAttachmentSelected}
              onAttachmentClear={handleAttachmentClear}
            />
          </>
        )}
      </div>

      <ChatInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        roomData={chatData}
        currentUserInfo={currentUserInfo}
      />
    </>
  );
};

export default ChatRoom;
