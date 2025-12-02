const ENDPOINT = "http://localhost:20349"

document.getElementById("register-form").addEventListener("submit", async(e) => {
    e.preventDefault(); // stop normal form submission

    console.log(ENDPOINT)

    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    const confirm = form.confirm_password.value;

    if (password != confirm) { 
        alert("passwords do not match");
        return;
    }

    const response = await fetch(ENDPOINT+"/register", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password})
    })

    const result = await response.json()
    
    if (result.ok) {
        alert("account created")
    } else {
        alert("user already exists")
    }


    // login after register
    const loginResponse = await fetch(ENDPOINT+"/login", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password})
    })

    const loginResult = await loginResponse.json()
    
    if (loginResult.ok) {
        localStorage.setItem("session_token", loginResult.token)
        localStorage.setItem("logged_in_user", loginResult.user_id)

        window.location.href = "../html/app.html"
    }
})