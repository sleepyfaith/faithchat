import { userCache } from "./app.js";
import { openSettingsPopup } from "./utils.js";

export async function getUser(userId) {
    if (!userCache[userId]) {
        const res = await fetch(`/users/user?id=${userId}`);
        userCache[userId] = await res.json();
    }
    return userCache[userId];
}

export async function updateUser(data) {
    const session_token = localStorage.getItem("session_token")
    try {
        const response = await fetch("/users/edit", {
            method: "PATCH",
            headers: { Authorization: "Bearer "+session_token, "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log(result)
    } catch (err) {
        console.error("Error updating user:", err);
    }
}

export async function showProfilePopup(element, user_id) {
    const user = userCache[user_id];


    if (user !== undefined) {
        
        const popup = document.getElementById("profile-popup");

        const content = document.createElement("div")
        content.classList.add("profile-popup-content")

    
        const header = document.createElement("div")
        header.classList.add("profile-header")
        const username = document.createElement("div")
        username.textContent = user.username
        username.classList.add("profile-username")

        const pfp = document.createElement("img")
        if (user.pfp_id == null) {
            pfp.src = "/pfps/default?id=" + user.id;
        } else {
            pfp.src = "/pfps/pfp?id=" + user.pfp_id;
        }

        header.appendChild(pfp)
        header.appendChild(username)

        
        const body = document.createElement("div")
        body.classList.add("profile-body")
            

        const about = document.createElement("div")
        about.classList.add("about-container")
        const aboutHeader = document.createElement("p")
        aboutHeader.classList.add("profile-about-header")
        aboutHeader.textContent  = "bio:"
        
        const aboutBody = document.createElement("div")
        aboutBody.classList.add("profile-about-content")
        aboutBody.textContent = user.about


        about.appendChild(aboutHeader)
        about.appendChild(aboutBody)

        body.appendChild(about)

        content.appendChild(header)
        content.appendChild(body)
        popup.replaceChildren(content)


        const rect = element.getBoundingClientRect();
        popup.style.left = rect.left + "px";
        popup.style.top = (rect.bottom + 4) + "px";  // 4px spacing below text

        popup.classList.remove("hidden");

    }
}

export async function loadUserProfileInfo() {
    const profileInfo = document.getElementById("profile-info")
    const fragment = document.createDocumentFragment();

    const userId = localStorage.getItem("logged_in_user")

    let user = await getUser(userId)

    const profileInfoContainer = document.createElement("div")
    profileInfoContainer.classList = "profile-info container"
    const pfp = document.createElement("img")
    if (user.pfp_id == null) {
        pfp.src = "/pfps/default?id=" + user.id;
    } else {
        pfp.src = "/pfps/pfp?id=" + user.pfp_id;
    }

    const username = document.createElement("span")
    username.textContent = user.username

    profileInfoContainer.appendChild(pfp)
    profileInfoContainer.appendChild(username)

    fragment.appendChild(profileInfoContainer)
    const settings = document.createElement("button")
    settings.addEventListener("click", () => { openSettingsPopup() })
    settings.textContent = "⚙"
    fragment.appendChild(settings)
    console.log(fragment)

    profileInfo.replaceChildren(fragment)

}