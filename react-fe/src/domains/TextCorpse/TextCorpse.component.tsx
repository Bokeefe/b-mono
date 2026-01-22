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
  const [needsPassword, setNeedsPassword] = useState(false);
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
      // Use polling first, then allow upgrade to websocket if available
      // This is more reliable than starting with websocket
      transports: isProduction ? ["polling"] : ["polling", "websocket"],
      upgrade: true, // Allow upgrade in both dev and prod
      rememberUpgrade: false, // Don't remember failed upgrades
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

    // Check if this is a new room being created
    const roomCreationData = roomId ? sessionStorage.getItem(`room-${roomId}`) : null;
    let roomPassword = '';
    let roomIsPublic = true;
    
    if (roomCreationData) {
      try {
        const parsed = JSON.parse(roomCreationData);
        roomPassword = parsed.password || '';
        roomIsPublic = parsed.isPublic !== undefined ? parsed.isPublic : true;
        // Clear the session storage after reading
        sessionStorage.removeItem(`room-${roomId}`);
      } catch (e) {
        console.error('Error parsing room creation data:', e);
      }
    }

    const handleConnect = () => {
      if (roomId) {
        // If this is a new room, create it first
        if (roomCreationData) {
          textCorpseSocket.emit("createRoom", {
            roomId,
            password: roomPassword,
            isPublic: roomIsPublic,
          });
        } else {
          // Try to join without password first (will prompt if needed)
          textCorpseSocket.emit("joinRoom", { roomId });
        }
      }
    };

    textCorpseSocket.on("connect", handleConnect);

    // If already connected, join immediately
    if (textCorpseSocket.connected) {
      if (roomCreationData) {
        textCorpseSocket.emit("createRoom", {
          roomId,
          password: roomPassword,
          isPublic: roomIsPublic,
        });
      } else {
        textCorpseSocket.emit("joinRoom", { roomId });
      }
    }

    textCorpseSocket.on("connect_error", (error) => {
      console.error("TextCorpse socket connection error:", error);
    });

    // Handle room creation
    textCorpseSocket.on("createRoomSuccess", () => {
      if (roomId) {
        // After creating, join the room
        textCorpseSocket.emit("joinRoom", { roomId, password: roomPassword });
      }
    });

    textCorpseSocket.on("createRoomError", (error: { error: string }) => {
      console.error("Error creating room:", error);
      setIsLoading(false);
    });

    // Handle join room errors (like password required)
    textCorpseSocket.on("joinRoomError", (error: { error: string }) => {
      if (error.error === 'Invalid password') {
        setNeedsPassword(true);
        setIsLocked(true);
        setIsLoading(false);
        // Still try to get room data (text) even if locked
        if (roomId) {
          textCorpseSocket.emit("getRoomData", { roomId });
        }
      }
    });

    // Listen for room data from the server (loaded from JSON file)
    textCorpseSocket.on(
      "roomData",
      (data: { roomId: string; text: string | null; isLocked?: boolean }) => {
        if (data && data.roomId === roomId) {
          setRoomText(data.text ?? "");
          setIsLoading(false);
          // If room is locked (has password), start locked and require unlock
          const shouldBeLocked = data.isLocked ?? false;
          setIsLocked(shouldBeLocked);
          if (shouldBeLocked) {
            setNeedsPassword(true);
          }
        }
      }
    );

    // Handle unlock success
    textCorpseSocket.on("unlockRoomSuccess", () => {
      setIsLocked(false);
      setNeedsPassword(false);
      // Rejoin to get the text
      if (roomId) {
        textCorpseSocket.emit("joinRoom", { roomId });
      }
    });

    textCorpseSocket.on("unlockRoomError", (error: { error: string }) => {
      alert(`Unlock failed: ${error.error}`);
    });

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
      textCorpseSocket.off("createRoomSuccess");
      textCorpseSocket.off("createRoomError");
      textCorpseSocket.off("joinRoomError");
      textCorpseSocket.off("unlockRoomSuccess");
      textCorpseSocket.off("unlockRoomError");
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
    if (!socket || !roomId) return;
    
    const password = prompt('Enter password to unlock this corpse:');
    if (password === null) {
      // User cancelled
      return;
    }
    
    socket.emit("unlockRoom", { roomId, password });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText || !socket || !roomId || isLocked) {
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
          <div className={`text-corpse-body ${isLocked ? 'locked' : ''}`} ref={textBodyRef}>
            {isLoading
              ? "Loading..."
              : visibleText || "No text in this room yet..."}
          </div>
          {isLocked && needsPassword && (
            <div style={{ padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', marginTop: '10px' }}>
              This corpse is locked. Click 'Unlock' to enter the password.
            </div>
          )}
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
          {isLocked && (
            <button
              type="button"
              className="submit-button"
              onClick={handleUnlock}
            >
              Unlock
            </button>
          )}
          <button
            type="submit"
            className="submit-button"
            disabled={text.trim().length === 0 || isLocked}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default TextCorpse;
