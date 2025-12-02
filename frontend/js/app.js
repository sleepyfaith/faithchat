import { toggleTheme, updateTheme, loadTheme, toggleSettingsView, initProfileView } from "./utils.js";
import { syncMessages } from "./messages.js";
import { initChatList } from "./chats.js";


export const userCache = {};

export let selectedChat = null;

export function setSelectedChat(chatId) {
    selectedChat = chatId;
}
initChatList()


// when typing in chat box send message on enter but not when shift + enter
const box = document.getElementById("msg");
box.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            return;                     // allow newline
        }

        e.preventDefault();             // stop newline
        send();                         // send message

        setTimeout(syncMessages, 100)   // sync messages after sending
    }
});

// on page load, load the current theme, sync messages and continue syncing every 10s, and init the profile view in right sidebar
loadTheme()
syncMessages()
setInterval(syncMessages, 10_000)
initProfileView()

// toggle theme on slider toggle
document.getElementById("theme-switch").addEventListener("change", toggleTheme)

// hide profile popup when anywhere but the popup is clicked
document.addEventListener("click", e => {
    const popup = document.getElementById("profile-popup");
    if (!popup.contains(e.target)) {
        popup.classList.add("hidden");
    }
})

// open/close settings when pressing settings button
document.getElementById("settings-button").addEventListener("click", toggleSettingsView)

// update the theme when slider moves
const slider = document.getElementById("hue-slider");
slider.addEventListener("input", updateTheme);
updateTheme();

