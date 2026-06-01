import { axiosAPI } from "@/service/axiosAPI";
import {
  parseTokenUserId,
  useChatWebSocket,
  type ServerSocketPayload,
} from "@/hooks/useChatWebSocket";
import { useAppDispatch, useAppSelector } from "@/store/hooks/hooks";
import { setCurrentChatData } from "@/store/slices/chatInfoSlice";
import { updateRoomUnreadCount } from "@/store/slices/chatRoomsSlice";
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
  Info,
  MoreVertical,
  Paperclip,
  Search,
  SendHorizonal,
  Trash2,
  Video,
} from "lucide-react";
import clsx from "clsx";
import { formatDateTime } from "@/utils/FormatDateTime";
import { getMessageStatus } from "@/utils/MessageStatus";
import { MessageStatusIcon } from "@/components/MessageStatusIcon";
import { ChatInfoModal } from "@/components";

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

  // Upward infinite scroll pagination states
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Upward infinite scroll pagination refs
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const nextPageUrlRef = useRef<string | null>(null);
  const isLoadingOlderMessagesRef = useRef<boolean>(false);
  const lastFetchedUrlRef = useRef<string | null>(null);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const initialLoadCompleteRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [typingUsers, setTypingUsers] = useState<MembarData[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
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
  const typingTimersRef = useRef<Record<number, number>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousLastMessageId = useRef<number | null>(null);

  const normalizeMessage = useCallback(
    (message: MessageData) => ({
      ...message,
      is_my: calculateIsMy(message, selfUserId),
      file: message.file ?? null,
      reply_to: message.reply_to ?? null,
      reads: message.reads ?? [],
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
    },
    [normalizeMessage, pendingMessageIds],
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

  const clearTypingTimer = useCallback((userId: number) => {
    if (typingTimersRef.current[userId]) {
      window.clearTimeout(typingTimersRef.current[userId]);
      delete typingTimersRef.current[userId];
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
            typingTimersRef.current[event.user_id.id] = window.setTimeout(
              () => {
                reportTypingUser(event.user_id, false);
                clearTypingTimer(event.user_id.id);
              },
              3000,
            );
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
  } = useChatWebSocket(room_id, handleServerEvent);

  sendReadRef.current = sendRead;

  const { currentUserInfo } = useAppSelector(state => state.chatInfo)

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
      nextPageUrlRef.current = null;
      setHasNextPage(false);
      setCurrentPage(1);
      lastFetchedUrlRef.current = null;
      scrollSnapshotRef.current = null;
      initialLoadCompleteRef.current = false;
      prevScrollHeightRef.current = 0;

      const response = await axiosAPI.get<{ next: string | null; results: MessageData[] }>(
        `room/${room_id}/messages/?limit=30`,
      );
      if (response.status === 200) {
        setMessages(
          response.data.results
            .map((item: MessageData) => normalizeMessage(item))
            .sort(
              (left: MessageData, right: MessageData) =>
                new Date(left.created_at).getTime() -
                new Date(right.created_at).getTime(),
            ),
        );

        // Store the pagination cursor link
        nextPageUrlRef.current = response.data.next;
        setHasNextPage(Boolean(response.data.next));
        initialLoadCompleteRef.current = true;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMessages(false);
    }
  }, [room_id, normalizeMessage]);

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

  // Load older messages (previous page)
  const loadOlderMessages = useCallback(async () => {
    const url = nextPageUrlRef.current;

    // Check if there's a next page URL and we're not already loading
    if (!url) {
      console.log('No next page URL available');
      return;
    }

    if (isLoadingOlderMessagesRef.current) {
      console.log('Already loading older messages');
      return;
    }

    // Guard: Prevent double-fetching the same URL
    if (lastFetchedUrlRef.current === url) {
      console.log('Already fetched this URL:', url);
      return;
    }

    console.log('Loading older messages from:', url);

    // Acquire loading locks
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);
    lastFetchedUrlRef.current = url;

    // Take scroll snapshot of the container before DOM modifications
    const container = chatMessagesRef.current;
    if (container) {
      scrollSnapshotRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
      prevScrollHeightRef.current = container.scrollHeight;
    }

    try {
      const response = await axiosAPI.get<{ next: string | null; results: MessageData[] }>(url);
      if (response.status === 200) {
        const oldMessages = response.data.results
          .map((item) => normalizeMessage(item))
          .sort(
            (left, right) =>
              new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
          );

        if (oldMessages.length > 0) {
          setMessages((prev) => {
            // Deduplicate to prevent race conditions or duplicate websocket prepends
            const existingIds = new Set(prev.map((msg) => msg.id));
            const uniqueOld = oldMessages.filter((msg) => !existingIds.has(msg.id));

            if (uniqueOld.length === 0) {
              console.log('All older messages already exist, moving to next page');
              // If all messages are duplicates, try next page
              nextPageUrlRef.current = response.data.next;
              setHasNextPage(Boolean(response.data.next));
              lastFetchedUrlRef.current = null; // Reset to allow next fetch

              // Release loading locks before recursive call
              isLoadingOlderMessagesRef.current = false;
              setIsLoadingOlderMessages(false);
              scrollSnapshotRef.current = null;

              // Recursively try next page if available
              if (response.data.next) {
                setTimeout(() => loadOlderMessages(), 100);
              }
              return prev;
            }

            const mergedMessages = [...uniqueOld, ...prev].sort(
              (left, right) =>
                new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
            );

            return mergedMessages;
          });

          // Update pagination endpoint cursor and page index
          nextPageUrlRef.current = response.data.next;
          setHasNextPage(Boolean(response.data.next));
          setCurrentPage((prevPage) => prevPage + 1);

          console.log('Loaded older messages, has next page:', Boolean(response.data.next));
        } else {
          // Empty results list indicates we have fully reached the beginning
          nextPageUrlRef.current = null;
          setHasNextPage(false);
          console.log('No more older messages to load');
        }
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
      // Clean snapshot in case of failure to avoid stuck state
      scrollSnapshotRef.current = null;
    } finally {
      // Release loading locks
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [normalizeMessage]);

  // Synchronously restore scroll position before browser repaints
  useLayoutEffect(() => {
    if (scrollSnapshotRef.current && chatMessagesRef.current) {
      const container = chatMessagesRef.current;
      const { scrollHeight, scrollTop } = scrollSnapshotRef.current;

      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeight;

      // Adjust scrollTop relative to the height difference of prepended messages
      container.scrollTop = scrollTop + heightDifference;

      console.log('Restored scroll position:', {
        oldHeight: scrollHeight,
        newHeight: newScrollHeight,
        difference: heightDifference,
        newScrollTop: container.scrollTop
      });

      // Clean up snapshotted state
      scrollSnapshotRef.current = null;
    }
  }, [messages]);

  // Monitor scroll height ticks to trigger loading older messages
  const handleScroll = useCallback(() => {
    const container = chatMessagesRef.current;
    if (!container || !initialLoadCompleteRef.current) return;

    // Clear previous timeout to debounce scroll events
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll handling
    scrollTimeoutRef.current = setTimeout(() => {
      // Trigger when scrolled close to the top boundary (threshold <= 50px)
      const isNearTop = container.scrollTop <= 50;

      console.log('Scroll check:', {
        scrollTop: container.scrollTop,
        isNearTop,
        hasNextPage: Boolean(nextPageUrlRef.current),
        isLoading: isLoadingOlderMessagesRef.current
      });

      if (isNearTop && nextPageUrlRef.current && !isLoadingOlderMessagesRef.current) {
        console.log('Triggering loadOlderMessages');
        loadOlderMessages();
      }
    }, 150); // 150ms debounce
  }, [loadOlderMessages]);

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
        msg.text.toLowerCase().includes(query)
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
      prev <= 0 ? matchedMessages.length - 1 : prev - 1
    );
  }, [matchedMessages]);

  const handleNextMatch = useCallback(() => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev >= matchedMessages.length - 1 ? 0 : prev + 1
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
              isActive && styless.highlight_active
            )}
          >
            {part}
          </mark>
        ) : (
          part
        );
      });
    },
    []
  );

  useEffect(() => {
    if (!isConnected || !selfUserId || !room_id) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          !msg.reads?.some(
            (read: { user: { id: number } }) => read.user.id === selfUserId,
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

  const handleInputChange = (value: string) => {
    setMessage(value);
    if (!value.trim()) {
      socketSendTyping(false);
      return;
    }
    socketSendTyping(true);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    setSendError(null);

    // Generate temporary negative ID for optimistic update to avoid colliding with server IDs
    const tempId = -Date.now();

    // Create optimistic message
    const optimisticMessage: MessageData = {
      id: tempId,
      type: "text",
      text: message,
      is_my: true,
      sender: {
        id: selfUserId || 0,
        full_name: "You",
        avatar: null,
      },
      reads: [],
      file: null,
      reply_to: null,
      created_at: new Date().toISOString(),
    };

    // Add to messages immediately (optimistic update)
    upsertMessage(optimisticMessage);
    pendingMessageSignaturesRef.current[tempId] = {
      text: message.trim(),
      created_at: optimisticMessage.created_at,
    };

    // Mark as pending
    setPendingMessageIds((prev) => new Set([...prev, tempId]));

    const wasSent = socketSendMessage(message);
    if (!wasSent) {
      setSendError(
        "Xabarni jo'nata olmadik. Iltimos, tarmoqqa ulanganingizni tekshiring.",
      );
      // Remove from pending on error
      setPendingMessageIds((prev) => {
        const updated = new Set(prev);
        updated.delete(tempId);
        return updated;
      });
      delete pendingMessageSignaturesRef.current[tempId];
      return;
    }

    setMessage("");
    socketSendTyping(false);
  };

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
                <button onClick={() => setIsInfoModalOpen(true)} title="Guruh/Chat ma'lumotlari">
                  <Info size={20} />
                </button>
              </div>
            </>
          )}
        </header>

        <div
          className={styless.chat_messages}
          ref={chatMessagesRef}
          onScroll={handleScroll}
        >
          {isLoadingOlderMessages && (
            <div className={styless.loading_text}>Kattaroq xabarlar yuklanmoqda...</div>
          )}

          {hasNextPage && !isLoadingOlderMessages && (
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
                  msg.text === "Xabar o'chirildi" && styless.message_deleted,
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
                      onChange={(event) => setEditingText(event.target.value)}
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
                        matchedMessages[currentMatchIndex]?.id === msg.id
                      )}
                    </p>
                    <div className={styless.message_footer}>
                      <span className={styless.message_time}>
                        {formatDateTime(msg.created_at)}
                      </span>
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

        <div className={styless.chat_input_wrapper}>
          <button className={styless.attach_btn} type="button">
            <Paperclip size={20} />
          </button>

          <div className={styless.chat_input_box}>
            <textarea
              placeholder="Xabar yozing..."
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={() => socketSendTyping(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
            />
          </div>

          <button
            className={styless.send_btn}
            onClick={handleSendMessage}
            type="button"
          >
            <SendHorizonal size={20} />
          </button>
        </div>

        {sendError && <div className={styless.input_error}>{sendError}</div>}
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