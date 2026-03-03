import { ENDPOINT, userCache, socket } from "./app.js"
import { updateUser } from "./users.js";
import { syncMessages } from "./messages.js";
import { initServerList } from "./servers.js";

export let selectedChat = null;
export let selectedServer = null;


export function setSelectedChat(chatId) {
    if (selectedChat) {
        socket.emit("leave_chat", { chat_id: selectedChat });
    }

    selectedChat = chatId;
    localStorage.setItem("selected-chat", chatId);

    socket.emit("join_chat", { chat_id: chatId });

    const chatbox = document.getElementById("msg");
    if (chatbox && chatbox.classList.contains("hidden")) {
        chatbox.classList.remove("hidden");
    }

    const messageContainer = document.getElementById("msg-container");
    if (messageContainer) messageContainer.innerHTML = "";


}
export function setSelectedServer(serverId) {
    selectedServer = serverId;
    clearMessagesFromChat();
    setSelectedChat(null);
    updateServerInfo();
    localStorage.setItem("selected-server", serverId)
}
export function loadSelectedChat() {
    const chat = localStorage.getItem("selected-chat")
    
    if (chat != "null") setSelectedChat(chat)
}
export function loadSelectedServer() {
    const server = localStorage.getItem("selected-server")
    if (server != "null") setSelectedServer(server)
}

export async function updateServerInfo() {
    const titlebar = document.getElementById("server-info")
    titlebar.innerHTML = ""
    const serverResponse = await fetch(ENDPOINT+"/servers/get?server_id="+selectedServer, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("session_token")
        }
    })
    const serverData = await serverResponse.json()
    const server = serverData.servers[0]

    const serverInfoContent = document.createElement("span")
    
    if (server) {
        serverInfoContent.textContent = server.name
        titlebar.appendChild(serverInfoContent)

        const inviteButton = document.createElement("button")
        inviteButton.textContent = "📩"
        inviteButton.addEventListener("click", async () => {
            try {
                const res = await fetch(ENDPOINT+`/servers/invite?server_id=${selectedServer}`, {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("session_token")
                    }
                });
                const data = await res.json();

                if (data.ok) {
                    await navigator.clipboard.writeText(data.invite);
                    alert("copied")
                } else {
                    console.log("error: " + data.reason);
                }
            } catch (err) {
                console.error(err);
            }

        });
        titlebar.appendChild(inviteButton)

    }

}

// toggle the current theme between dark mode and light mode
export function toggleTheme() { 

    var darkMode = localStorage.getItem("mainDarkMode");
    if (darkMode == "true") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
    } 
    else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
    }

    localStorage.setItem("mainDarkMode", darkMode=="false" ? "true" : false);
}

// load current theme based on local storage data if present
export function loadTheme() {

    var darkMode = localStorage.getItem("mainDarkMode");
    const hue = localStorage.getItem("base-colour")

    document.documentElement.style.setProperty("--base-colour", hue)

    const slider = document.getElementById("hue-slider");
    slider.value = hue


    if (darkMode == null) {
        localStorage.setItem("mainDarkMode", "false");
        document.documentElement.classList.add("light");
    }
    else if (darkMode == "false") {
        document.documentElement.classList.add("light");
    }
    else {
        document.documentElement.classList.add("dark");
        document.getElementById("theme-switch").checked = true
    }
}

// update the hue used in theme information based on the slider
export function updateTheme() {
    const slider = document.getElementById("hue-slider");

    const hue = slider.value;
    document.documentElement.style.setProperty("--base-colour", hue);
    localStorage.setItem("base-colour", hue)
}

// check if a timestamp (yyyy-mm-dd hh:mm:ss) is today
function isToday(timestamp) {
    const epochSeconds = new Date(timestamp.replace(" ", "T"));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return epochSeconds >= todayStart && epochSeconds <= Date.now()
}

// check if two timestamps (yyyy-mm-dd hh:mm:ss) are within the same day
export function isSameDay(timestamp1, timestamp2) {
    const d1 = new Date(timestamp1.replace(" ", "T"));
    const d2 = new Date(timestamp2.replace(" ", "T"));

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
  );
}

// convert timestamp (yyyy-mm-dd hh:mm:ss) to dd M yy
export function getDateString(timestamp) {
    const d = new Date(timestamp.replace(" ", "T"));
    return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
}

// convert timestamp (yyyy-mm-dd hh:mm:ss) to hh:mm:ss and only show the date (dd/MM/yyyy) if the message wasnt sent today
export function beautifyTimestamp(timestamp) {

    let date = timestamp.split(" ")[0].split("-").reverse().join("/")
    let time = timestamp.split(" ")[1]

    if (isToday(timestamp)) {
        return `${time}`
    } else {
        return `${time} ${date}`
    }

}

// send message to backend
export async function sendMessageRESTApi() {
    const token = localStorage.getItem("session_token");
    const message = document.getElementById("msg").value

    const response = fetch(ENDPOINT+"/chats/message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: message, chat_id: selectedChat })
    })
    syncMessages()

    document.getElementById("msg").value = "";

}
export function sendMessage() {
    const messageInput = document.getElementById("msg");
    const message = messageInput.value.trim();
    if (!message || !selectedChat) return;


    socket.emit("send_message", {
        chat_id: selectedChat,
        message: message
    });
    console.log(socket)

    messageInput.value = "";
}

// toggle visibility of the settings menu in the right sidebar
export function toggleSettingsView() {
    document.getElementById("settings").classList.toggle("hidden")
}


export async function initProfileView() {    

    const id = localStorage.getItem("logged_in_user");

    const res = await fetch(`${ENDPOINT}/users/user?id=${id}`);
    const user = await res.json();
    userCache[id] = user;

    const profileMenu = document.getElementById("profile-menu");


    const editProfileBtn = document.createElement("button");
    editProfileBtn.classList.add("edit-btn");
    editProfileBtn.textContent = "✎"; 

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;

    const header = document.createElement("div");
    header.classList.add("profile-header");

    const username = document.createElement("div");
    username.textContent = user.username;
    username.classList.add("profile-username");

    const pfp = document.createElement("img");
    if (user.pfp_id == null) {
        pfp.src = ENDPOINT + "/pfps/default?id=" + user.id;
    } else {
        pfp.src = ENDPOINT + "/pfps/pfp?id=" + user.pfp_id;
    }

    header.appendChild(pfp);
    header.appendChild(username);

    const body = document.createElement("div");
    body.classList.add("profile-body");

    const about = document.createElement("div");
    about.classList.add("about-container");

    const aboutHeader = document.createElement("p");
    aboutHeader.classList.add("profile-about-header");
    aboutHeader.textContent = "bio:";

    const aboutBody = document.createElement("div");
    aboutBody.classList.add("profile-about-content");
    aboutBody.textContent = user.about;

    about.appendChild(aboutHeader);
    about.appendChild(aboutBody);

    body.appendChild(about);

    profileMenu.appendChild(editProfileBtn);
    profileMenu.appendChild(fileInput);
    profileMenu.appendChild(header);
    profileMenu.appendChild(body);

    let pendingPfpFile = null;   

    // upload pfp logic
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;

        // create preview and store file for later
        pfp.src = URL.createObjectURL(file);
        pendingPfpFile = file;                      
    });


    // EDIT MODE 
    let usernameTextarea;
    let bioTextarea;

    function enterEditMode() {
        editProfileBtn.textContent = "💾";
        editProfileBtn.removeEventListener("click", enterEditMode);
        editProfileBtn.addEventListener("click", saveProfile);

        // Username textarea
        usernameTextarea = document.createElement("textarea");
        usernameTextarea.value = username.textContent;
        username.replaceWith(usernameTextarea);

        // Bio textarea
        bioTextarea = document.createElement("textarea");
        bioTextarea.value = aboutBody.textContent;
        aboutBody.replaceWith(bioTextarea);

        // Make PFP clickable
        pfp.classList.add("pfp-editable");

        function openFilePicker() {
            fileInput.click();
        }

        pfp.addEventListener("click", openFilePicker);
        pfp._removePfpHandler = openFilePicker;
    }

    // SAVE MODE
    async function saveProfile() {
        editProfileBtn.textContent = "✎";
        editProfileBtn.removeEventListener("click", saveProfile);
        editProfileBtn.addEventListener("click", enterEditMode);

        await updateUser({
            username: usernameTextarea.value,
            bio: bioTextarea.value,
            session_id: localStorage.getItem("session_token"),
        });

        if (pendingPfpFile) {
            const form = new FormData();
            form.append("session_id", localStorage.getItem("session_token"));
            form.append("image", pendingPfpFile);

            await fetch(`${ENDPOINT}/update_pfp`, {
                method: "POST",
                body: form
            });

            pendingPfpFile = null; // reset
        }

        username.textContent = usernameTextarea.value;
        aboutBody.textContent = bioTextarea.value;

        usernameTextarea.replaceWith(username);
        bioTextarea.replaceWith(aboutBody);

        pfp.classList.remove("pfp-editable");
        pfp.removeEventListener("click", pfp._removePfpHandler);

        setTimeout(syncMessages, 100);
    }

    editProfileBtn.addEventListener("click", enterEditMode);
}

export async function clearMessagesFromChat() {
    document.getElementById("msg-container").innerHTML = ""
}


export function handleSocketMessage(msg) {
    // ignore messages that aren't for the selected chat
    if (msg.chat_id !== selectedChat) return;

    const messageContainer = document.getElementById("msg-container");

    // fetch sender info from cache or backend
    async function getUser(userId) {
        if (!userCache[userId]) {
            const res = await fetch(`${ENDPOINT}/users/user?id=${userId}`);
            userCache[userId] = await res.json();
        }
        return userCache[userId];
    }

    (async () => {
        const user = await getUser(msg.sender_id);

        // last message info to handle separators
        let lastElement = messageContainer.lastElementChild;
        let lastUser = undefined;
        let lastTimestamp = undefined;

        if (lastElement) {
            lastUser = lastElement.dataset.author;
            lastTimestamp = lastElement.dataset.timestamp;
        }
        

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

        if (lastUser !== msg.sender_id || !sameDay) {
            const messageContent = document.createElement("div");
            messageContent.classList.add("message-body");

            const messageElement = document.createElement("div");
            messageElement.classList.add("message");
            messageElement.id = msg.message_id;
            messageElement.dataset.senderId = msg.sender_id;
            messageElement.dataset.timestamp = msg.timestamp;

            const pfp = document.createElement("img");
            pfp.src = user.pfp_id == null
                ? ENDPOINT + "/pfps/default?id=" + user.id
                : ENDPOINT + "/pfps/pfp?id=" + user.pfp_id;

            const header = document.createElement("div");
            header.classList.add("message-header");

            const username = document.createElement("div");
            username.classList.add("message-username");
            username.textContent = user.username;
            username.addEventListener("click", (e) => {
                e.stopPropagation();
                showProfilePopup(e.target, user.id);
            });

            const timestamp = document.createElement("div");
            timestamp.classList.add("message-timestamp");
            timestamp.textContent = beautifyTimestamp(msg.timestamp);

            header.appendChild(username);
            header.appendChild(timestamp);

            messageElement.appendChild(pfp);
            messageContent.appendChild(header);
            
            // body (content)
            const body = document.createElement("p");
            body.classList.add("message-content");
            body.textContent = msg.content;

            messageContent.appendChild(body);
            messageElement.appendChild(messageContent);

            fragment.appendChild(messageElement);
        }

        messageContainer.appendChild(fragment);
        messageContainer.scrollTop = messageContainer.scrollHeight; // auto-scroll
    })();
}