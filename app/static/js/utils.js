export function isSameDay(timestamp1, timestamp2) {
    const d1 = new Date(timestamp1.replace(" ", "T"));
    const d2 = new Date(timestamp2.replace(" ", "T"));

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
  );
}
export function getDateString(timestamp) {
    const d = new Date(timestamp.replace(" ", "T"));
    return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
}
export function beautifyTimestamp(timestamp) {

    let date = timestamp.split(" ")[0].split("-").reverse().join("/")
    let time = timestamp.split(" ")[1]

    if (isToday(timestamp)) {
        return `${time}`
    } else {
        return `${time} ${date}`
    }

}
function isToday(timestamp) {
    const epochSeconds = new Date(timestamp.replace(" ", "T"));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return epochSeconds >= todayStart && epochSeconds <= Date.now()
}

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

export function loadTheme() {

    var darkMode = localStorage.getItem("mainDarkMode");
    const hue = localStorage.getItem("base-colour")

    document.documentElement.style.setProperty("--base-colour", hue)

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

export function updateTheme() {
    const slider = document.getElementById("hue-slider");

    const hue = slider.value;
    document.documentElement.style.setProperty("--base-colour", hue);
    localStorage.setItem("base-colour", hue)
}


export function openSettingsPopup() {
    const popup = document.getElementById("settings-popup")

    popup.innerHTML = `
        <div class="settings-container">

            <aside class="settings-sidebar">
                <button data-tab="profile">Profile</button>
                <button data-tab="app">App</button>
            </aside>

            <section class="settings-content" id="settings-content"></section>

            <button class="close button" id="settings-close">×</button>

        </div>
    `

    document.getElementById("settings-close")
        .addEventListener("click", () => popup.close())

    setupSidebar()

    loadSettingsTab("profile")

    popup.showModal()
}
function setupSidebar() {
    const buttons = document.querySelectorAll(".settings-sidebar button")

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            loadSettingsTab(btn.dataset.tab)
        })
    })
}
function loadSettingsTab(tab) {
    const container = document.getElementById("settings-content")

    switch (tab) {
        case "profile":
            container.innerHTML = getProfileSettings()
            break

        case "app":
            container.innerHTML = getAppSettings()
            break
    }


    const hueSlider = container.querySelector("#hue-slider")
    const themeSwitch = container.querySelector("#theme-switch")

    if (hueSlider) {
        hueSlider.addEventListener("input", updateTheme)
    }

    if (themeSwitch) {
        themeSwitch.addEventListener("click", toggleTheme)
    }
}
export function getProfileSettings() {
    return ``
}

export function getAppSettings() {
    return `
        <div class="separator">appearance</div>
        <input id="hue-slider" type="range" min="0" max="360" value="${localStorage.getItem("base-colour")}>
        <div class="theme-toggle">
            <div class="switch-container">
            <span class="switch-label" data-i18n="settings.theme">dark mode</span>
            <label class="switch" for="theme-switch">
            <input id="theme-switch" type="checkbox">
                <span class="slider round"></span>
            </label>
        </div>  
    `
}