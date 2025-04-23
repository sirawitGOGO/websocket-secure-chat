import WebSocket, { WebSocketServer } from "ws";
import crypto from "crypto";

const wss = new WebSocketServer({ port: 8000 });
let activeUser: WebSocket | null = null;
let activeUsername: string | null = null;
let serverPrivateKey: crypto.KeyObject;
let serverPublicKey: string;

// Generate RSA key pair when server starts
function generateKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "der"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der"
    }
  });

  serverPrivateKey = crypto.createPrivateKey({
    key: privateKey,
    format: "der",
    type: "pkcs8"
  });

  // Convert public key to base64 for easy transmission
  serverPublicKey = publicKey.toString("base64");
}

// Generate keys when server starts
generateKeyPair();

wss.on("connection", (ws) => {
  if (activeUser) {
    ws.send("Server is in use");
    console.log("❌ Someone try to connect the server");
    ws.close();
    return;
  }

  activeUser = ws;

  // Send public key to client upon connection
  ws.send(JSON.stringify({
    type: "public_key",
    key: serverPublicKey
  }));

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "join") {
        activeUsername = parsed.username;
        console.log(`👤 ${activeUsername} joined`);
        ws.send(`✅ Welcome, ${activeUsername}!`);
      } else if (parsed.type === "message") {
        const decryptedMessage = crypto.privateDecrypt(
          { key: serverPrivateKey, oaepHash: "sha256" },
          Buffer.from(parsed.encryptedData)
        ).toString("utf-8");

        console.log(`📩 ${activeUsername}: ${decryptedMessage.toUpperCase()}`);
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