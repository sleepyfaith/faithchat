import { userCache, ENDPOINT, selectedChat } from "./app.js"
import { getDateString, beautifyTimestamp, isSameDay } from "./utils.js";
import { showProfilePopup } from "./users.js"

export async function syncMessages() { 


    if (selectedChat == undefined) {
        return
    }

    // get user session token
    const token = localStorage.getItem("session_token");

    let messages = undefined

    try {
        // request messages from backend
        const response = await fetch(ENDPOINT+"/messages", {
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
        const res = await fetch(`${ENDPOINT}/user?id=${id}`);
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

        // ignore messages that have chat ids that dont match the selected chat id
        if (message.chat_id != selectedChat) {
            return
        }

        // check if the message was sent today
        let sameDay = false
        if (lastTimestamp != undefined) {
            sameDay = isSameDay(lastTimestamp, message.timestamp)
        }


        // add a seperator if the date is a new day
        if (lastTimestamp == undefined || !sameDay) {
            const separator = document.createElement("div")
            separator.classList.add("separator")
            separator.textContent = getDateString(message.timestamp)
            fragment.appendChild(separator)

        }

        // only add header if different message author or different day
        if (lastUser !== message.sender_id || !sameDay) {
            messageContent = document.createElement("div")
            messageContent.classList.add("message-body")

            messageElement = document.createElement("div")
            messageElement.classList.add("message")
            messageElement.id = message.message_id
            
            const pfp = document.createElement("img");
            if (user.pfp_id == null) {
                pfp.src = ENDPOINT + "/default_pfp?id=" + user.id;
            } else {
                pfp.src = ENDPOINT + "/pfp?id=" + user.pfp_id;
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
            timestamp.textContent = beautifyTimestamp(message.timestamp)


            header.appendChild(username)
            header.appendChild(timestamp)
            
            messageElement.appendChild(pfp)
            messageContent.appendChild(header)

        }
        // body (content)
        const body = document.createElement("p")
        body.classList.add("message-content")
        body.textContent = message.content

        messageContent.appendChild(body)
        messageElement.appendChild(messageContent)
        messageContainer.appendChild(messageElement)

        fragment.appendChild(messageElement);

        lastUser = message.sender_id
        lastTimestamp = message.timestamp

    }
    messageContainer.replaceChildren(fragment);
}

