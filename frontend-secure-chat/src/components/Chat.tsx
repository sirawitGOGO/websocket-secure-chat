// Chat.tsx
import { useState } from "react";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);

  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8000");

    ws.onopen = () => {
      console.log("✅ Connected");
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      try {
        if (event.data === "Server is in use") {
          alert("🚫 Another user is currently using the chat.");
          ws.close();
          setSocket(null);
          setIsConnected(false);
          return;
        } else {
          const data = JSON.parse(event.data);
          if (data.type === "public_key") {
            const keyBase64 = data.key;
            const signatureBase64 = data.signature;
  
            const verified = await verifyPublicKey(keyBase64, signatureBase64);
            if (!verified) {
              alert("❌ Invalid server signature. Connection not trusted.");
              ws.close();
              return;
            }
  
            const importedKey = await importPublicKey(keyBase64);
            setPublicKey(importedKey);
  
            // Send username after verification
            ws.send(JSON.stringify({ type: "join", username }));
            return;
          }
        }

        setChatLog((prev) => [...prev, `🔹 Server: ${event.data}`]);
      } catch {
        setChatLog((prev) => [...prev, `🔹 Server: ${event.data}`]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    setSocket(ws);
  };

  const importPublicKey = async (keyBase64: string): Promise<CryptoKey> => {
    const binaryDer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  };

  const verifyPublicKey = async (keyBase64: string, signatureBase64: string): Promise<boolean> => {
    const binaryKey = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

    const verifyKey = await window.crypto.subtle.importKey(
      "spki",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"]
    );

    try {
      const verified = await window.crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        verifyKey,
        signature,
        binaryKey
      );
      return verified;
    } catch {
      return false;
    }
  };

  const encryptMessage = async (msg: string): Promise<Uint8Array> => {
    if (!publicKey) throw new Error("No public key available");

    const encoded = new TextEncoder().encode(msg);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      encoded
    );
    return new Uint8Array(encrypted);
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
      const encrypted = await encryptMessage(message);
      socket.send(JSON.stringify({ type: "message", encryptedData: Array.from(encrypted) }));
      setChatLog((prev) => [...prev, `🟢 ${username}: ${message}`]);
      setMessage("");
    } catch {
      setChatLog((prev) => [...prev, "🔴 Failed to send message"]);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white h-screen flex flex-col items-center justify-center">
      {!isConnected ? (
        <div className="bg-gray-800 p-4 rounded w-96">
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
        <div className="bg-gray-800 p-4 rounded w-96">
          <h2 className="text-xl font-bold text-center">🔒 Secure Chat</h2>
          <div className="mt-4 h-40 overflow-y-auto bg-gray-700 p-2 rounded">
            {chatLog.map((msg, idx) => (
              <p key={idx} className="text-sm">{msg}</p>
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
