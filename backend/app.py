import mimetypes
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

from passlib.hash import argon2 
import sqlite3
import uuid
import io
import os

from generate_pfp import generate_user_pfp


app = Flask(__name__)
CORS(app)

database = sqlite3.connect("data.db", check_same_thread=False)
database_cursor = database.cursor()

database_cursor.execute("""
CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    hash TEXT NOT NULL,
    pfp_id TEXT,
    about TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")
database_cursor.execute("""
CREATE TABLE IF NOT EXISTS sessions(
    user_id TEXT NOT NULL,
    token TEXT PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")
database_cursor.execute("""
CREATE TABLE IF NOT EXISTS messages(
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (sender_id) REFERENCES users(id)
)
""")
database_cursor.execute("""
CREATE TABLE IF NOT EXISTS chats(
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    type TEXT DEFAULT 'private',
    admin_only BOOLEAN DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id)
)
""")
database.commit()


from flask import g

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect("data.db")
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()



@app.post("/register")
def register():
    data = request.json

    username = data["username"]
    password = data["password"]

    # USER database format USERID, USERNAME, HASH, PFP_ID, ABOUT, TIMESTAMP

    USERID = str(uuid.uuid4())
    HASH = argon2.hash(password)

    db = get_db()
    cursor = db.cursor()

    cursor.execute("INSERT INTO users (id, username, hash) VALUES (?, ?, ?)", (USERID, username, HASH))
    db.commit()
    
    return jsonify(ok=True)

@app.post("/login")
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    db = get_db()
    cursor = db.cursor()

    row = cursor.execute("SELECT id, hash FROM users WHERE username=?", (username,)).fetchone()

    if row and argon2.verify(password, row[1]):
        token = str(uuid.uuid4())
        user_id = row[0]

        cursor.execute("INSERT INTO sessions VALUES (?, ?)", (user_id, token))
        db.commit()
        return jsonify(ok=True, token=token, user_id=user_id)
    
    return jsonify(ok=False)

@app.post("/message")
def message():

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify(ok=False, reason="missing_token")

    msg = request.json.get("message")

    if not msg:
        return jsonify(ok=False, reason="empty_message")


    token = auth.split(" ", 1)[1]

    db = get_db()
    cursor = db.cursor()

    row = cursor.execute("SELECT user_id FROM sessions WHERE token=?", (token,)).fetchone()
    if not row:
        return jsonify(ok=False, reason="invalid token")

    user_id = row[0]    
    msg_id = str(uuid.uuid4())

    cursor.execute("INSERT INTO messages (id, sender_id, content) VALUES (?, ?, ?)", (msg_id, user_id, msg))

    db.commit()
    
    return jsonify(ok=True)

@app.post("/update_pfp")
def update_pfp():
    session_id = request.form.get("session_id")
    if not session_id:
        return jsonify(ok=False, reason="missing token")

    db = get_db()
    cursor = db.cursor()
    row = cursor.execute("SELECT user_id FROM sessions WHERE token=?", (session_id,)).fetchone()

    if not row:
        return jsonify(ok=False, reason="invalid session")

    user_id = row[0]
    if "image" not in request.files:    
        return jsonify(ok=False, reason="no image file provided")
    
    image = request.files["image"]

    if image.filename == "":
        return jsonify(ok=False, reason="empty filename")

    ext = image.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        return jsonify(ok=False, reason="invalid file type")
    
    filename = f"{user_id}.{ext}"
    filepath = os.path.join("pfp_storage", filename)

    os.makedirs("pfp_storage", exist_ok=True)

    image.save(filepath)

    db.execute("UPDATE users SET pfp_id=? WHERE id=?", (filename, user_id))
    db.commit()

    return jsonify(ok=True, pfp_id=filename)
# GET 

@app.get("/chats")
def get_chats():
    db = get_db()
    cursor = db.cursor()
    chat_rows = cursor.execute("SELECT id, name, created_at, created_by, type, admin_only FROM chats ORDER BY created_at ASC").fetchall()

    chats = [
        {"id": r[0], "name": r[1], "created_at": r[2], "created_by": r[3], "type": r[4], "admin_only": r[5]}
        for r in chat_rows
    ]
    return jsonify(chats=chats)

@app.get("/messages")
def get_messages():
    db = get_db()
    cursor = db.cursor()

    message_rows = cursor.execute("SELECT id, sender_id, chat_id, content, timestamp FROM messages ORDER BY timestamp ASC").fetchall()

    messages = [
        {"message_id": r[0], "sender_id": r[1], "chat_id": r[2], "content": r[3], "timestamp": r[4]}
        for r in message_rows
    ]
    return jsonify(messages=messages)

@app.get("/user")
def get_user():
    user_id = request.args.get("id")

    if not user_id:
        return jsonify(ok=False, reason="missing id")
    
    db = get_db()
    cursor = db.cursor()

    row = cursor.execute("SELECT id, username, pfp_id, about, created_at FROM users WHERE id=?", (user_id,)).fetchone()
    
    if not row:
        return jsonify(ok=False, reason="user not found")
    
    return jsonify(
        ok=True,
        id=row[0],
        username=row[1],
        pfp_id=row[2],
        about=row[3],
        created_at=row[4]
    )

@app.get("/default_pfp")
def get_default_pfp():
    user_id = request.args.get("id")
    if not user_id:
        return "missing user id", 400
    
    img = generate_user_pfp(user_id)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(buf, mimetype="image/png")

@app.get("/pfp")
def get_pfp():
    pfp_id = request.args.get("id")
    if not pfp_id:
        return "missing pfp id", 400

    pfp_filename = os.path.join("pfp_storage", pfp_id)
    if not os.path.isfile(pfp_filename):
        return "no pfp exists", 401
    

    mimetype, _ = mimetypes.guess_type(pfp_filename)
    if mimetype is None:
        mimetype = "application/octet-stream"  # fallback

    return send_file(pfp_filename, mimetype=mimetype)


# PATCH
@app.patch("/edit_user")
def edit_user():
    data = request.json

    bio = data.get("bio")
    username = data.get("username")

    session_id = data["session_id"]

    print(bio, username, session_id)

    db = get_db()
    cursor = db.cursor()

    row = cursor.execute("SELECT user_id FROM sessions WHERE token=?", (session_id,)).fetchone()
    if not row:
        return jsonify(ok=False, reason="invalid token")
    
    user_id = row[0]

    if bio is not None:
        if bio == "":
            cursor.execute("UPDATE users SET about = NULL WHERE id = ?", (user_id,))
        else:
            cursor.execute("UPDATE users SET about = ? WHERE id = ?", (bio, user_id))

    if username is not None:
        cursor.execute("UPDATE users SET username = ? WHERE id = ?", (username, user_id))

    db.commit()

    return jsonify(ok=True)



if __name__ == "__main__":
    app.run(port=20349, debug=True)
