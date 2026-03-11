import { socket } from "./app.js"
import { loadMessages } from "./messages.js";
import { selectedServer } from "./servers.js";


export let selectedChat = null;


export async function loadChatList() {

    if (!selectedServer || !selectedChat) {

        const chatbox = document.getElementById("msg")
        if (!chatbox.classList.contains("hidden")) {
            chatbox.classList.add("hidden")
        }

    }

    const chatList = document.getElementById("chats")
    const fragment = document.createDocumentFragment();

    const createChat = document.createElement("div")
    createChat.classList = "create-chat button"
    createChat.textContent = "+"
    createChat.addEventListener("click", () => { openCreateChatPopup(selectedServer) })

    fragment.append(createChat)
    const divder = document.createElement("div")
    divder.classList = "divider"
    fragment.append(divder)

    if (selectedServer) {
        const response = await fetch("/chats/get?server_id="+selectedServer, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("session_token")
            }
        })  
        const data = await response.json()
        const chats = data.chats

        if (chats) {
            try {
                for (let i = 0; i < chats.length; i++) {
                    const chat = chats[i]

                    let chatElement = createChatElement(chat)

                    fragment.appendChild(chatElement)
                }
            }
            catch(e) { console.error(e) }
        }
    }

    chatList.replaceChildren(fragment)

}

export function setSelectedChat(chatId) {
    if (selectedChat) {
        socket.emit("leave_chat", { chat_id: selectedChat });
    }

    selectedChat = chatId;
    localStorage.setItem("selected-chat", chatId);

    loadMessages()

    socket.emit("join_chat", { chat_id: chatId });

    const chatbox = document.getElementById("msg");
    if (chatbox && chatbox.classList.contains("hidden")) {
        chatbox.classList.remove("hidden");
    }

    const messageContainer = document.getElementById("msg-container");
    if (messageContainer) messageContainer.innerHTML = "";
    

}


export function loadSelectedChat() {
    const chat = localStorage.getItem("selected-chat")
    if (chat != "null") {
        setSelectedChat(chat)
    } 
}

export async function clearMessagesFromChat() {
    document.getElementById("msg-container").innerHTML = ""
}

async function createChat(server_id, name) {
    const response = await fetch("/chats/create", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("session_token"),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            server_id: server_id,
            name: name
        })
    })
    if (!response.ok) {
        throw new Error("failed to create chat "+name)
    }
}

async function openCreateChatPopup(server_id) {
    const popup = document.getElementById("create-chat-popup")
    popup.innerHTML = "";

    const form = document.createElement("form")


    const header = document.createElement("p")
    header.classList = "title"
    header.textContent = "create a chat"

    const nameInput = document.createElement("input")
    nameInput.placeholder = "chat name"
    nameInput.classList = "chat-name textinput"
    
    const createButton = document.createElement("button")
    createButton.textContent = "create"
    createButton.classList = "submit button"

    form.append(header, nameInput, createButton)
    popup.append(form)

    form.addEventListener("submit", (e) => {
        e.preventDefault()
        createChat(server_id, nameInput.value)
        popup.close()
    })

    popup.showModal()
    nameInput.focus()
}

export function handleNewChat(chat) {
    // ignore chats that aren't for the selected servers
    if (chat.server_id !== selectedServer) return;

    const chatList = document.getElementById("chats")
    
    const chatElement = createChatElement(chat)

    chatList.appendChild(chatElement)
}

function createChatElement(chat) {
    const chatList = document.getElementById("chats")

    const chatContainer = document.createElement("div")
    chatContainer.classList.add("chat-container")
    chatContainer.id = chat.id
    
    if (selectedChat == chat.id) {
        chatContainer.classList.add("selected")
    }

    const chatIcon = document.createElement("div")
    chatIcon.classList.add("chat-icon")
    chatIcon.textContent = "🗨"

    const chatName = document.createElement("div")
    chatName.classList.add("chat-name")
    chatName.textContent = chat.name

    chatContainer.appendChild(chatIcon)
    chatContainer.appendChild(chatName)

    // select channel on click

    chatContainer.addEventListener("click", () => {
        setSelectedChat(chatContainer.id)
        const selected = chatList.querySelector(".selected")
        if (selected) {
            selected.classList.toggle("selected")
        }
        chatContainer.classList.toggle("selected")
    })

    return chatContainer
}

