import { useCallback, useEffect, useRef, useState } from "react";

type ClientMessageType = "text" | "file" | "image" | "voice";

type SocketStatus =
  | "closed"
  | "connecting"
  | "open"
  | "reconnecting"
  | "auth_failed"
  | "forbidden"
  | "error";

interface SendMessagePayload {
  type: "message";
  text?: string;
  file?: File | Blob | ArrayBuffer;
  file_id?: number;
  file_ids?: number[]; 
  msg_type: ClientMessageType;
  reply_to: number | null;
}

interface SendReadPayload {
  type: "read";
  message_id: number;
}

interface SendTypingPayload {
  type: "typing";
  is_typing: boolean;
}

interface SendDeletePayload {
  type: "delete";
  message_id: number;
}

interface SendUpdatePayload {
  type: "update";
  message_id: number;
  text: string;
}

export type ClientSocketPayload =
  | SendMessagePayload
  | SendReadPayload
  | SendTypingPayload
  | SendDeletePayload
  | SendUpdatePayload;

interface ServerTypingPayload {
  type: "typing";
  user_id: MembarData;
  is_typing: boolean;
}

interface ServerReadPayload {
  type: "read";
  message_id: number;
  user: MembarData;
}

interface ServerMessagePayload {
  type: "message";
  message: MessageData;
}

interface ServerDeletedPayload {
  type: "deleted";
  message_id: number;
  deleted_by: MembarData;
}

interface ServerUpdatedPayload {
  type: "updated";
  message: MessageData;
}

interface ServerErrorPayload {
  type: "error";
  detail: string;
}

export type ServerSocketPayload =
  | ServerTypingPayload
  | ServerReadPayload
  | ServerMessagePayload
  | ServerDeletedPayload
  | ServerUpdatedPayload
  | ServerErrorPayload;

const SOCKET_BASE_URL = "wss://chat.m-gaz.uz/ws/chat";
const RECONNECT_DELAY_MS = 3000;
const TYPING_DEBOUNCE_MS = 2000;

function normalizeBase64(base64: string) {
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

function parseTokenUserId(token: string | null): number | null {
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const decoded = atob(normalizeBase64(payloadPart));
    const payload = JSON.parse(decoded);
    return typeof payload.user_id === "number" ? payload.user_id : parseInt(payload.user_id, 10) || null;
  } catch {
    return null;
  }
}

export function useChatWebSocket(
  roomId: string | undefined,
  onServerEvent: (event: ServerSocketPayload) => void,
) {
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [lastError, setLastError] = useState<string | null>(null);

  const statusRef = useRef<SocketStatus>("closed");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);
  const pendingTyping = useRef(false);
  const isMounted = useRef(false);
  const currentRoomId = useRef<string | undefined>(roomId);

  const cleanupSocket = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;

      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, "Room switched");
      }
    }

    wsRef.current = null;
  }, []);

  const setStatusSafe = useCallback((value: SocketStatus) => {
    statusRef.current = value;
    setStatus(value);
  }, []);

  const sendPayload = useCallback((payload: ClientSocketPayload): boolean => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (payload.type === "message" && payload.msg_type === "file") {
      
      if (payload.file_ids && payload.file_ids.length > 0) {
        socket.send(JSON.stringify(payload));
        return true;
      }

      
      if (payload.file_id != null) {
        socket.send(JSON.stringify(payload));
        return true;
      }

      
      if (payload.file) {
        const metadata = {
          type: payload.type,
          msg_type: payload.msg_type,
          reply_to: payload.reply_to,
        };
        const separator = "\n\n";
        const blob = new Blob([JSON.stringify(metadata), separator, payload.file]);
        socket.send(blob);
        return true;
      }
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendMessage = useCallback(
    (
      textOrFile: string | File | Blob,
      msgType: ClientMessageType = "text",
      replyTo: number | null = null,
    ) => {
      if (msgType === "file") {
        if (!(textOrFile instanceof Blob)) return false;
        return sendPayload({
          type: "message",
          file: textOrFile,
          msg_type: msgType,
          reply_to: replyTo,
        });
      }

      if (typeof textOrFile !== "string" || !textOrFile.trim()) return false;
      return sendPayload({
        type: "message",
        text: textOrFile.trim(),
        msg_type: msgType,
        reply_to: replyTo,
      });
    },
    [sendPayload],
  );

  
  const sendMultipleFiles = useCallback(
    (fileIds: number[], text?: string, replyTo: number | null = null): boolean => {
      if (!fileIds || fileIds.length === 0) {
        console.error("No file IDs provided");
        return false;
      }

      return sendPayload({
        type: "message",
        msg_type: "file",
        text: text?.trim() || undefined,
        file_ids: fileIds,
        reply_to: replyTo,
      });
    },
    [sendPayload],
  );

  
  const sendFileId = useCallback(
    (fileId: number, text?: string, replyTo: number | null = null): boolean => {
      return sendMultipleFiles([fileId], text, replyTo);
    },
    [sendMultipleFiles],
  );

  const sendRead = useCallback(
    (messageId: number) => sendPayload({ type: "read", message_id: messageId }),
    [sendPayload],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!pendingTyping.current && !isTyping) {
        return false;
      }

      pendingTyping.current = isTyping;
      const isSent = sendPayload({ type: "typing", is_typing: isTyping });
      if (!isSent) {
        return false;
      }

      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }

      if (isTyping) {
        typingTimer.current = window.setTimeout(() => {
          pendingTyping.current = false;
          sendPayload({ type: "typing", is_typing: false });
        }, TYPING_DEBOUNCE_MS);
      }

      return true;
    },
    [sendPayload],
  );

  const sendDelete = useCallback(
    (messageId: number) => sendPayload({ type: "delete", message_id: messageId }),
    [sendPayload],
  );

  const sendUpdate = useCallback(
    (messageId: number, text: string) => {
      if (!text.trim()) return false;
      return sendPayload({ type: "update", message_id: messageId, text: text.trim() });
    },
    [sendPayload],
  );

  const sendFile = useCallback(
    async (
      file: Blob,
      onProgress?: (percent: number) => void,
      msgType: ClientMessageType = "file",
      replyTo: number | null = null,
    ): Promise<boolean> => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;

      try {
        const metadata = {
          type: "message",
          msg_type: msgType,
          reply_to: replyTo,
        };

        const separator = "\n\n";
        const blob = new Blob([JSON.stringify(metadata), separator, file]);

        const total = (file as any).size ?? (blob as Blob).size;

        socket.send(blob);

        if (onProgress) {
          const start = Date.now();
          const maxWait = 120000;
          const interval = 200;

          const tick = () => {
            try {
              const buffered = socket.bufferedAmount || 0;
              const sent = Math.max(0, total - buffered);
              const percent = Math.min(100, Math.round((sent / total) * 100));
              onProgress(percent);
              if (buffered === 0 || Date.now() - start > maxWait) {
                onProgress(100);
                return;
              }
              setTimeout(tick, interval);
            } catch (e) {
              onProgress(100);
            }
          };

          setTimeout(tick, 50);
        }

        return true;
      } catch (err) {
        console.error("sendFile error:", err);
        return false;
      }
    },
    [],
  );

  const scheduleReconnect = useCallback(() => {
    if (statusRef.current === "auth_failed" || statusRef.current === "forbidden") {
      return;
    }

    setStatusSafe("reconnecting");
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
    }

    reconnectTimer.current = window.setTimeout(() => {
      if (currentRoomId.current) {
        connectWebSocket(currentRoomId.current);
      }
    }, RECONNECT_DELAY_MS);
  }, [setStatusSafe]);

  const handleServerMessage = useCallback(
    (rawMessage: string) => {
      try {
        const json = JSON.parse(rawMessage) as ServerSocketPayload;
        onServerEvent(json);
      } catch (error) {
        console.error("Chat socket could not parse incoming message", error);
      }
    },
    [onServerEvent],
  );

  const connectWebSocket = useCallback(
    (room: string) => {
      if (
        currentRoomId.current === room &&
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      cleanupSocket();
      currentRoomId.current = room;
      const token = localStorage.getItem("unify_chat_token");

      if (!token) {
        setStatusSafe("auth_failed");
        setLastError("Token is missing. Please set your access token.");
        return;
      }

      setStatusSafe("connecting");
      setLastError(null);
      const url = `${SOCKET_BASE_URL}/${encodeURIComponent(room)}/?token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatusSafe("open");
        setLastError(null);
      };

      socket.onmessage = (event) => {
        handleServerMessage(event.data);
      };

      socket.onerror = () => {
        setLastError("Realtime connection failed. Retrying...");
      };

      socket.onclose = (event) => {
        if (event.code === 4001) {
          setStatusSafe("auth_failed");
          setLastError("WebSocket token invalid or expired.");
          return;
        }

        if (event.code === 4003) {
          setStatusSafe("forbidden");
          setLastError("You are not a member of this room.");
          return;
        }

        if (event.wasClean) {
          setStatusSafe("closed");
        } else {
          scheduleReconnect();
        }
      };
    },
    [cleanupSocket, handleServerMessage, scheduleReconnect, setStatusSafe],
  );

  const connectWebSocketRef = useRef<((room: string) => void) | null>(null);

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket]);

  useEffect(() => {
    if (!roomId) {
      cleanupSocket();
      setStatusSafe("closed");
      return;
    }

    connectWebSocketRef.current?.(roomId);
    return () => {
      cleanupSocket();
    };
  }, [roomId, cleanupSocket, setStatusSafe, connectWebSocket]);

  return {
    status,
    lastError,
    isConnected: status === "open",
    sendMessage,
    sendRead,
    sendTyping,
    sendDelete,
    sendUpdate,
    sendFile,
    sendFileId,        
    sendMultipleFiles, 
  };
}

export { parseTokenUserId };