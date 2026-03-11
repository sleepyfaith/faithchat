import { isSameDay, getDateString, beautifyTimestamp } from "./utils.js";
import { selectedChat } from "./chats.js";
import { socket, userCache } from "./app.js";
import { getUser, showProfilePopup } from "./users.js"


export async function loadMessages() { 

    if (selectedChat == undefined || selectedChat == null) {
        return
    }

    // get user session token
    const token = localStorage.getItem("session_token");
    
    let messages = undefined

    try {
        // request messages from backend
        const response = await fetch("/chats/messages?chat_id="+selectedChat, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        

        const data = await response.json();
        messages = data.messages

    } catch (err) {
        console.error("Failed to fetch messages:", err);
    }

    // create div to render messages inside
    const messageContainer = document.getElementById("msg-container");



    // add users to cache to prevent multiple useless calls to backend
    const uniqueIds = [...new Set(messages.map(m => m.sender_id))];
    await Promise.all(
    uniqueIds.map(async id => {
        const res = await fetch(`/users/user?id=${id}`);
        userCache[id] = await res.json();
    })
    );

    // create a fragment so all changes get rendered at the same time
    const fragment = document.createDocumentFragment();

    let lastUser = undefined;
    let lastTimestamp = undefined;

    let messageElement;
    let messageContent;

    // iterate over every message receieved from the backend
    for (let i = 0; i < messages.length; i++) {

        const message = messages[i]
        const user = userCache[message.sender_id];
        

        if (message.chat_id != selectedChat) {
            return
        }
        messageElement = createMessageElement(message, user, lastUser, lastTimestamp)

        fragment.appendChild(messageElement);

        
        lastUser = message.sender_id
        lastTimestamp = message.timestamp

    }
    messageContainer.replaceChildren(fragment);

    messageContainer.scrollTop = messageContainer.scrollHeight;

}



export function sendMessage() {
    const messageInput = document.getElementById("msg");
    const message = messageInput.value.trim();
    if (!message || !selectedChat) return;


    socket.emit("send_message", {
        chat_id: selectedChat,
        message: message
    });

    messageInput.value = "";
}

export function handleNewMessage(msg) {
    // ignore messages that aren't for the selected chat
    if (msg.chat_id !== selectedChat) return;

    const messageContainer = document.getElementById("msg-container");



    (async () => {

        const user = await getUser(msg.sender_id);
        const fragment = document.createDocumentFragment();
        
        let lastElement = messageContainer.lastElementChild;
        let lastUser = undefined;
        let lastTimestamp = undefined;

        if (lastElement) {
            lastUser = lastElement.dataset.author;
            lastTimestamp = lastElement.dataset.timestamp;
        }


        let messageElement = createMessageElement(msg, user, lastUser, lastTimestamp);
        fragment.appendChild(messageElement);

        messageContainer.appendChild(fragment);
        messageContainer.scrollTop = messageContainer.scrollHeight; // auto-scroll

    })();
}


function createMessageElement(msg, user, lastUser, lastTimestamp) {
    const messageContainer = document.getElementById("msg-container");


    // check if new day
    let sameDay = lastTimestamp ? isSameDay(lastTimestamp, msg.timestamp) : false;

    const fragment = document.createDocumentFragment();

    // add separator if day changed
    if (!sameDay) {
        const separator = document.createElement("div");
        separator.classList.add("separator");
        separator.textContent = getDateString(msg.timestamp);
        fragment.appendChild(separator);
    }

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-body");

        
    const messageElement = document.createElement("div")

    messageElement.classList.add("message")
    messageElement.id = msg.message_id
    
    const pfp = document.createElement("img");
    if (user.pfp_id == null) {
        pfp.src = "/pfps/default?id=" + user.id;
    } else {
        pfp.src = "/pfps/pfp?id=" + user.pfp_id;
    }

    const header = document.createElement("div")
    header.classList.add("message-header")

    const username = document.createElement("div")
    username.classList.add("message-username")
    username.textContent = user.username

    username.addEventListener("click", (e) => { 
        e.stopPropagation();
        showProfilePopup(e.target, user.id)
    })

    const timestamp = document.createElement("div")
    timestamp.classList.add("message-timestamp")
    timestamp.textContent = beautifyTimestamp(msg.timestamp)


    header.appendChild(username)
    header.appendChild(timestamp)
    
    messageElement.appendChild(pfp)
    messageContent.appendChild(header)

    // body (content)
    const body = document.createElement("p")
    body.classList.add("message-content")
    body.textContent = msg.content

    messageContent.appendChild(body)
    messageElement.appendChild(messageContent)
    messageContainer.appendChild(messageElement)

    messageElement.dataset.timestamp = msg.timestamp
    messageElement.dataset.author = msg.sender_id

    return messageElement

    
}