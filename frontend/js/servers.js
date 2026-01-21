import { ENDPOINT } from "./app.js"
import { initChatList } from "./chats.js"
import { selectedServer, setSelectedServer } from "./utils.js"

export async function initServerList() {
    const response = await fetch(ENDPOINT+"/servers/", {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("session_token")
        }
    })
    const data = await response.json()

    const servers = data.servers

    const serverList = document.getElementById("servers")
    const fragment = document.createDocumentFragment();

    try {

        for (let i = 0; i < servers.length; i++) {
            const server = servers[i]

            const serverContainer = document.createElement("div")
            serverContainer.classList.add("server-container")
            serverContainer.id = server.id
            
            if (selectedServer == server.id) {
                serverContainer.classList.add("selected")
            }

            const serverIcon = document.createElement("div")
            serverIcon.classList.add("server-icon")

            let initials = ""
            let words = server.name.split(" ")
            for (let i = 0; i < words.length; i++) {
                initials = initials + words[i][0]
            }
            serverIcon.textContent = initials
            
            serverContainer.appendChild(serverIcon)

            // select server on click
            serverContainer.addEventListener("click", () => { selectServer(serverContainer) })


            fragment.appendChild(serverContainer)
        }
    }
    catch(e) {console.error(e)}

    const createServer = document.createElement("div")
    createServer.classList.add("create-server")
    createServer.classList.add("server-icon")
    createServer.textContent = "+"
    createServer.addEventListener("click", () => { openCreateServerPopup() } )
    fragment.appendChild(createServer)
    

    serverList.replaceChildren(fragment)
}

async function openCreateServerPopup() {
    const popup = document.getElementById("create-server-popup")
    popup.innerHTML = "";

    const form = document.createElement("form")


    const header = document.createElement("p")
    header.classList = "title"
    header.textContent = "create a server"

    const nameInput = document.createElement("input")
    nameInput.placeholder = "server name"
    nameInput.classList = "server-name textinput"
    
    const createButton = document.createElement("button")
    createButton.textContent = "create"
    createButton.classList = "submit button"
    

    form.append(header, nameInput, createButton)
    popup.append(form)

    form.addEventListener("submit", (e) => {
        e.preventDefault()
        createServer(nameInput.value)
        popup.close()
    })

    popup.showModal()
    nameInput.focus()
}

async function createServer(name) {
    const response = await fetch(ENDPOINT+"/servers/create", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("session_token"),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    })
    if (!response.ok) {
        throw new Error("failed to create server "+name)
    }
    initServerList()

}

async function selectServer(serverContainer) {
    const serverList = document.getElementById("servers")

    setSelectedServer(serverContainer.id)
    const selected = serverList.querySelector(".selected")
    if (selected) {
        selected.classList.toggle("selected")
    }
    serverContainer.classList.toggle("selected")

    initChatList()
}

