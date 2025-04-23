import { useState } from "react";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8000");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "public_key") {
          // Received public key from server
          setPublicKey(data.key);
          // Now that we have the public key, send our username
          ws.send(JSON.stringify({ type: "join", username }));
          return;
        }

        if (event.data === "Server is in use") {
          alert("🚫 Another user is currently using the chat. Please wait.");
          ws.close();
          setSocket(null);
          setIsConnected(false);
          return;
        }
        
        setChatLog((prev) => [...prev, `🔹 Server: ${event.data}`]);
      } catch {
        setChatLog((prev) => [...prev, `🔹 Server: ${event.data}`]);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket closed");
      setIsConnected(false);
    };

    setSocket(ws);
  };

  const importPublicKey = async (keyBase64: string) => {
    const binaryDer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  };

  const encryptMessage = async (message: string) => {
    if (!publicKey) throw new Error("No public key available");
    
    const publicKeyObj = await importPublicKey(publicKey);
    const encodedMessage = new TextEncoder().encode(message);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKeyObj,
      encodedMessage
    );

    return Array.from(new Uint8Array(encrypted));
  };

  const sendMessage = async () => {
    if (!message || !socket) return;

    if (message.toLowerCase() === "exit") {
      socket.send(JSON.stringify({ type: "exit" }));
      socket.close();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    try {
      const encryptedData = await encryptMessage(message);
      socket.send(JSON.stringify({ type: "message", encryptedData }));
      setChatLog((prev) => [...prev, `🟢 ${username}: ${message}`]);
      setMessage("");
    } catch (error) {
      console.error("Encryption error:", error);
      setChatLog((prev) => [...prev, `🔴 Error sending message`]);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white h-screen flex flex-col items-center justify-center">
      {!isConnected ? (
        <div className="bg-gray-800 p-4 rounded-md shadow-lg w-96">
          <h2 className="text-xl font-bold text-center">👤 Enter Your Name</h2>
          <input
            className="mt-2 w-full p-2 rounded bg-gray-600 text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name..."
          />
          <button
            className="mt-2 w-full bg-green-500 p-2 rounded text-white"
            onClick={connectWebSocket}
            disabled={!username}
          >
            Start Chat
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-4 rounded-md shadow-lg w-96">
          <h2 className="text-xl font-bold text-center">🔒 Secure Chat</h2>
          <div className="mt-4 h-40 overflow-y-auto bg-gray-700 p-2 rounded">
            {chatLog.map((msg, index) => (
              <p key={index} className="text-sm">{msg}</p>
            ))}
          </div>
          <input
            className="mt-2 w-full p-2 rounded bg-gray-600 text-white"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            className="mt-2 w-full bg-blue-500 p-2 rounded text-white"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}