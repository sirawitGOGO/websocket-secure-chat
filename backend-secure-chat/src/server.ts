// server.ts
import WebSocket, { WebSocketServer } from "ws";
import crypto from "crypto";

const wss = new WebSocketServer({ port: 8000 });
let activeUser: WebSocket | null = null;
let activeUsername: string | null = null;

let serverPrivateKey: crypto.KeyObject;
let serverPublicKeyDer: Buffer;
let serverPublicKeyBase64: string;
let publicKeySignatureBase64: string;

function generateKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "der",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der",
    },
  });

  serverPrivateKey = crypto.createPrivateKey({
    key: privateKey,
    format: "der",
    type: "pkcs8",
  });

  serverPublicKeyDer = publicKey; // Buffer
  serverPublicKeyBase64 = publicKey.toString("base64");

  // Sign the public key using the private key
  const signature = crypto.sign("sha256", publicKey, serverPrivateKey);
  publicKeySignatureBase64 = signature.toString("base64");
}

generateKeyPair();

wss.on("connection", (ws) => {
  if (activeUser) {
    ws.send("Server is in use");
    ws.close();
    return;
  }

  activeUser = ws;

  ws.send(JSON.stringify({
    type: "public_key",
    key: serverPublicKeyBase64,
    signature: publicKeySignatureBase64,
  }));

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "join") {
        activeUsername = parsed.username;
        ws.send(`✅ Welcome, ${activeUsername}!`);
      } else if (parsed.type === "message") {
        const decryptedMessage = crypto.privateDecrypt(
          { key: serverPrivateKey, oaepHash: "sha256" },
          Buffer.from(parsed.encryptedData)
        ).toString("utf-8");

        console.log(`📩 ${activeUsername}: ${decryptedMessage}`);
      } else if (parsed.type === "exit") {
        ws.send("👋 You have exited the chat.");
        ws.close();
      }
    } catch (err) {
      console.error("❌ Error:", err);
    }
  });

  ws.on("close", () => {
    activeUser = null;
    activeUsername = null;
  });
});

console.log("🚀 WebSocket Server running on ws://localhost:8000");
