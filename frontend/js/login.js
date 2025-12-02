import { ENDPOINT } from "./app.js";

document.getElementById("login-form").addEventListener("submit", async(e) => {
    e.preventDefault(); // stop normal form submission

    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;

    const response = await fetch(ENDPOINT+"/login", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password})
    })

    const result = await response.json()
    
    if (result.ok) {
        localStorage.setItem("session_token", result.token)
        localStorage.setItem("logged_in_user", result.user_id)

        window.location.href = "../html/app.html"
    } else {
        alert("username or password is incorrect")
    }
})