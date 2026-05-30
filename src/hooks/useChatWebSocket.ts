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
  text: string;
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

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendMessage = useCallback(
    (text: string, msgType: ClientMessageType = "text", replyTo: number | null = null) => {
      if (!text.trim()) return false;
      return sendPayload({ type: "message", text: text.trim(), msg_type: msgType, reply_to: replyTo });
    },
    [sendPayload],
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
    [cleanupSocket, handleServerMessage, scheduleReconnect],
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
  }, [roomId, cleanupSocket, setStatusSafe]);

  return {
    status,
    lastError,
    isConnected: status === "open",
    sendMessage,
    sendRead,
    sendTyping,
    sendDelete,
    sendUpdate,
  };
}

export { parseTokenUserId };
