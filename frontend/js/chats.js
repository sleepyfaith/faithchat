import { ENDPOINT, setSelectedChat } from "./app.js";
import { syncMessages } from "./messages.js";

export async function initChatList() {
    const response = await fetch(ENDPOINT+"/chats")
    const data = await response.json()

    const chats = data.chats

    const chatList = document.getElementById("chats")
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < chats.length; i++) {
        const chat = chats[i]

        const chatContainer = document.createElement("div")
        chatContainer.classList.add("chat-container")
        chatContainer.id = chat.id

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
        console.log(chat.name)
    }
    chatList.replaceChildren(fragment)
}