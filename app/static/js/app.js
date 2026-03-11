import { loadChatList, loadSelectedChat, handleNewChat } from "./chats.js";
import { sendMessage, handleNewMessage } from "./messages.js";
import { loadServerList, loadSelectedServer } from "./servers.js";
import { loadUserProfileInfo } from "./users.js";
import { loadTheme } from "./utils.js";

export const userCache = {};


export const socket = io("http://localhost:20349", {
    auth: {
        token: localStorage.getItem("session_token")
    }
});

socket.on("connect", () => console.log("connected!"));
socket.on("connect_error", (err) => console.log("Connection error:", err));

socket.on("new_message", (msg) => {
    console.log(msg)
    handleNewMessage(msg)
});
socket.on("new_chat", (chat) => {
    console.log(chat)
    handleNewChat(chat)
});

loadTheme()

loadSelectedServer();

loadServerList();
loadChatList();

setTimeout(loadUserProfileInfo, 100)

const box = document.getElementById("msg");
box.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            return;                     // allow newline
        }

        e.preventDefault();             // stop newline
        sendMessage();                  // send message
    }
});
