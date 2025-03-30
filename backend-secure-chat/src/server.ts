import WebSocket, { WebSocketServer } from "ws";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;

function importPrivateKey(): crypto.KeyObject {
  return crypto.createPrivateKey({
    key: Buffer.from(PRIVATE_KEY, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

const wss = new WebSocketServer({ port: 8000 });
let activeUser: WebSocket | null = null;
let activeUsername: string | null = null;

wss.on("connection", (ws) => {
  if (activeUser) {
    ws.send("Can not use this server, another user is already connected.");
    ws.close();
    return;
  }

  activeUser = ws;

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "join") {
        activeUsername = parsed.username;
        console.log(`👤 ${activeUsername} joined`);
        ws.send(`✅ Welcome, ${activeUsername}!`);
      } else if (parsed.type === "message") {
        const privateKey = importPrivateKey();
        const decryptedMessage = crypto.privateDecrypt(
          { key: privateKey, oaepHash: "sha256" },
          Buffer.from(parsed.encryptedData)
        ).toString("utf-8");

        console.log(`📩 ${activeUsername}: ${decryptedMessage}`);
        ws.send(`🔓 Server received: ${decryptedMessage.toUpperCase()}`);
      } else if (parsed.type === "exit") {
        console.log(`👤 ${activeUsername} left`);
        ws.send("👋 You have exited the chat.");
        ws.close();
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
    }
  });

  ws.on("close", () => {
    console.log(`❌ Connection closed for ${activeUsername}`);
    activeUser = null;
    activeUsername = null;
  });
});

console.log("🚀 WebSocket Server running on ws://localhost:8000");
