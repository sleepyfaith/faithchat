import { ENDPOINT, userCache } from "./app.js"
import { updateUser } from "./users.js";
import { syncMessages } from "./messages.js";

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
export async function sendMessage() {
    const token = localStorage.getItem("session_token");
    const message = document.getElementById("msg").value

    const response = fetch(ENDPOINT+"/message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message })
    })

    document.getElementById("msg").value = "";
    
}

// toggle visibility of the settings menu in the right sidebar
export function toggleSettingsView() {
    document.getElementById("settings").classList.toggle("hidden")
}


export async function initProfileView() {    

    const id = localStorage.getItem("logged_in_user");

    const res = await fetch(`${ENDPOINT}/user?id=${id}`);
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
        pfp.src = ENDPOINT + "/default_pfp?id=" + user.id;
    } else {
        pfp.src = ENDPOINT + "/pfp?id=" + user.pfp_id;
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
