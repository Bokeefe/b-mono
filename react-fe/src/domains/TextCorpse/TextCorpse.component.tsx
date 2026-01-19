import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { baseUrl } from "../../environment";
import "./TextCorpse.scss";

const TextCorpse: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [text, setText] = useState("");
  const [roomText, setRoomText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const MAX_CHARS = 170;

  const [socket, setSocket] = useState<Socket | null>(null);
  const textBodyRef = React.useRef<HTMLDivElement>(null);
  const MAX_VISIBLE_CHARS = 1000; // tweak based on your layout
  const visibleText =
    roomText.length > MAX_VISIBLE_CHARS
      ? roomText.slice(-MAX_VISIBLE_CHARS)
      : roomText;

  useEffect(() => {
    if (!roomId) return;

    setIsLoading(true); // Reset loading state when roomId changes

    // Determine if we're in production
    const isProduction = typeof import.meta !== "undefined" &&
      (import.meta as any).env?.MODE === "production";

    // Socket.io connection options
    const socketOptions: any = {
      // Use polling only in production - works reliably through Cloudflare without WebSocket upgrade issues
      // Allow websocket in dev for better performance
      transports: isProduction ? ["polling"] : ["websocket", "polling"],
      upgrade: !isProduction, // Disable WebSocket upgrade in production
      rememberUpgrade: !isProduction,
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    };

    // In production, socket.io is proxied through nginx at /socket.io/
    // Socket.io client defaults to /socket.io path, which matches nginx proxy
    // Explicitly set path to ensure it works correctly with namespaces
    if (isProduction) {
      socketOptions.path = '/socket.io';
    }

    // Connect to the text-corpse namespace
    const textCorpseSocket = io(`${baseUrl}/text-corpse`, socketOptions);

    setSocket(textCorpseSocket);

    let requestTimeout: NodeJS.Timeout;

    const handleConnect = () => {
      if (roomId) {
        textCorpseSocket.emit("joinRoom", { roomId });
      }
    };

    textCorpseSocket.on("connect", handleConnect);

    // If already connected, join immediately
    if (textCorpseSocket.connected) {
      textCorpseSocket.emit("joinRoom", { roomId });
    }

    textCorpseSocket.on("connect_error", (error) => {
      console.error("TextCorpse socket connection error:", error);
    });

    // Listen for room data from the server (loaded from JSON file)
    textCorpseSocket.on(
      "roomData",
      (data: { roomId: string; text: string | null }) => {
        if (data && data.roomId === roomId) {
          setRoomText(data.text ?? "");
          setIsLoading(false);
        }
      }
    );

    // Request room data explicitly as a fallback after a short delay
    // This ensures we get the data even if joinRoom doesn't trigger it
    requestTimeout = setTimeout(() => {
      if (textCorpseSocket.connected && roomId) {
        textCorpseSocket.emit("getRoomData", { roomId });
      }
    }, 1000);

    // Listen for text updates from other clients
    textCorpseSocket.on(
      "textUpdated",
      ({ roomId: updatedRoomId, text: updatedText }) => {
        if (updatedRoomId === roomId) {
          setRoomText(updatedText || "");
          setIsLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(requestTimeout);
      textCorpseSocket.off("connect", handleConnect);
      textCorpseSocket.off("roomData");
      textCorpseSocket.off("textUpdated");
      textCorpseSocket.disconnect();
      setSocket(null);
    };
  }, [roomId]);

  useEffect(() => {
    const textBody = textBodyRef.current;
    if (!textBody) return;

    // Always scroll to the bottom when text updates
    textBody.scrollTop = textBody.scrollHeight;
  }, [roomText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setText(value);
    }

    if (value.endsWith("\n")) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const handleUnlock = () => {
    setIsLocked(!isLocked);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText || !socket || !roomId) {
      return;
    }

    // Emit appendText event to server
    socket.emit("appendText", { roomId, text: trimmedText });

    // Clear the textarea
    setText("");
  };

  const remainingChars = MAX_CHARS - text.length;

  return (
    <div className="page-container text-corpse-container">
      <div className="text-corpse">
        <div className="text-corpse-content">
          <h1>Text Corpse</h1>
          {roomId && <h2>Room: {roomId}</h2>}
          <div className={`text-corpse-body ${isLocked ? 'locked' : ''}`}   ref={textBodyRef}>
            {isLoading
              ? "Loading..."
              : visibleText || "No text in this room yet..."}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="text-corpse-form">
          <div className="textarea-container">
            <textarea
              value={text}
              onChange={handleChange}
              placeholder="Enter your text here..."
              className="text-corpse-textarea"
              rows={4}
            />
            <div className="char-counter">
              {remainingChars} characters remaining
            </div>
          </div>
          <button
            type="button"
            className="submit-button"
            onClick={handleUnlock}
            
          >
            {isLocked ? 'Un' : 'L'}ock
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={text.trim().length === 0}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default TextCorpse;
