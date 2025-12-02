import { userCache, ENDPOINT } from "./app.js"


// tell backend to update user information
export async function updateUser(data) {
    try {
        const response = await fetch(ENDPOINT+"/edit_user", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log("Update result:", result);
    } catch (err) {
        console.error("Error updating user:", err);
    }
}

// render selected user in pre-existing profile popup and unhide it
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
            pfp.src = ENDPOINT+"/default_pfp?id="+user.id
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
