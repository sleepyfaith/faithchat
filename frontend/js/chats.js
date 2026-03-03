import { ENDPOINT } from "./app.js";
import { syncMessages } from "./messages.js";
import { selectedChat, selectedServer, setSelectedChat } from "./utils.js"

export async function initChatList() {

    if (!selectedServer || !selectedChat) {

        const chatbox = document.getElementById("msg")
        if (!chatbox.classList.contains("hidden")) {
            chatbox.classList.add("hidden")
        }

    }

    const response = await fetch(ENDPOINT+"/chats/get?server_id="+selectedServer, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("session_token")
        }
    })
    const data = await response.json()
    const chats = data.chats
    const chatList = document.getElementById("chats")
    const fragment = document.createDocumentFragment();

    const createChat = document.createElement("div")
    createChat.classList = "create-chat button"
    createChat.textContent = "+"
    createChat.addEventListener("click", () => { openCreateChatPopup(selectedServer) })

    fragment.append(createChat)

    try {

        for (let i = 0; i < chats.length; i++) {
            const chat = chats[i]

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
                setTimeout(syncMessages, 100)
            })


            fragment.appendChild(chatContainer)
        }
    }
    catch(e) { console.error(e) }
    chatList.replaceChildren(fragment)
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

async function createChat(server_id, name) {
    console.log(server_id)
    const response = await fetch(ENDPOINT+"/chats/create", {
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
    initChatList()

}