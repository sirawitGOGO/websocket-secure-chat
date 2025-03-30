# Project Setup Guide
  - This project is using a Asymmetric algorithms with Websocket to a secure communication.
## Set Up Dependencies
  - In both frontend-secure-chat and backend-secure-chat
  - Install dependencies:
    ```
    npm install
    ```
  - Generate private key and public key at root folder
  - Run this 2 commands
    ```
    openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
    ```
    ```
    openssl rsa -pubout -in private.pem -out public.pem
    ```
  - Copy the key to the .env file in both frontend and backend

## Executing the Code
  - In frontend-secure-chat
  - Run the application:
    ```
    npm run dev
    ```
  - In backend-secure-chat
  - Run the server:
    ```
    npx ts-node src/server.ts
    ```
