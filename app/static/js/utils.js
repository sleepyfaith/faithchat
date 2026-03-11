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