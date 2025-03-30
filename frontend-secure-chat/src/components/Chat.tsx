import { useState } from "react";

const PUBLIC_KEY = import.meta.env.VITE_PUBLIC_KEY;

async function importPublicKey() {
    const binaryDer = Uint8Array.from(atob(PUBLIC_KEY), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

async function encryptMessage(message: string) {
    const publicKey = await importPublicKey();
    const encodedMessage = new TextEncoder().encode(message);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        encodedMessage
    );

    return Array.from(new Uint8Array(encrypted));
}

export default function Chat() {
    const [username, setUsername] = useState("");
    const [message, setMessage] = useState("");
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [chatLog, setChatLog] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const connectWebSocket = () => {
        const ws = new WebSocket("ws://localhost:8000");

        ws.onopen = () => {
            console.log("✅ WebSocket connected");
            ws.send(JSON.stringify({ type: "join", username })); // ส่งชื่อไปให้เซิร์ฟเวอร์
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            if (event.data === "Can not use this server, another user is already connected.") {
                alert("🚫 Another user is currently using the chat. Please wait.");
                ws.close();
                setSocket(null);
                setIsConnected(false);
                return;
            }
            setChatLog((prev) => [...prev, `🔹 Server: ${event.data}`]);
        };

        ws.onclose = () => {
            console.log("❌ WebSocket closed");
            setIsConnected(false);
        };

        setSocket(ws);
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

        const encryptedData = await encryptMessage(message);
        socket.send(JSON.stringify({ type: "message", encryptedData }));
        setChatLog((prev) => [...prev, `🟢 ${username}: ${message}`]);
        setMessage("");
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
