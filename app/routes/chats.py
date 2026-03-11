from flask import Blueprint, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import sqlite3, uuid
from utils import get_db, require_user, require_chat_access
from app import socketio


chats_bp = Blueprint("chats", __name__)

@chats_bp.post("/create")
def create_chat():
    data = request.json
    server_id = data.get("server_id")
    name = data.get("name", "")
    if not server_id:
        return jsonify(ok=False, reason="missing chat_id")

    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    chat_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO chats (id, name, created_by, server_id) VALUES (?, ?, ?, ?)",
        (chat_id, name, user_id, server_id)
    )
    db.commit()

    socketio.emit("new_chat", {"server_id": server_id, "name": name, "id": chat_id})

    return jsonify(ok=True, chat_id=chat_id)


@chats_bp.get("/get")
def get_chats():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    server_id = request.args.get("server_id")
    chat_id = request.args.get("chat_id")

    if not (server_id or chat_id):
        return jsonify(ok=False, reason="missing server or chat id")


    if server_id:    
        chat_rows = db.execute(
            "SELECT chats.id, chats.name, chats.created_at, chats.created_by, chats.type, chats.admin_only "
            "FROM chats JOIN server_members ON server_members.server_id = chats.server_id "
            "WHERE server_members.user_id = ? AND chats.server_id = ? ORDER BY chats.created_at ASC",
            (user_id, server_id)
        ).fetchall()

    else: 
        chat_rows = db.execute(
            "SELECT chats.id, chats.name, chats.created_at, chats.created_by, chats.type, chats.admin_only "
            "FROM chats JOIN server_members ON server_members.server_id = chats.server_id "
            "WHERE server_members.user_id = ? AND chats.id = ? ORDER BY chats.created_at ASC",
            (user_id, chat_id)
        ).fetchall()

    chats = [
        {"id": r[0], "name": r[1], "created_at": r[2], "created_by": r[3], "type": r[4], "admin_only": r[5]}
        for r in chat_rows
    ]
    return jsonify(chats=chats)

@socketio.on("join_chat")
def on_join(data):
    
    db = get_db()
    user_id, error, status = require_user(db, type="socket")
    
    if error:
        socketio.emit("error", {"reason": "unauthorized"})
        return

    chat_id = data.get("chat_id")
    if not require_chat_access(db, user_id, chat_id):
        socketio.emit("error", {"reason": "forbidden"})
        return

    join_room(chat_id)
    socketio.emit("status", {"msg": f"user {user_id} joined chat {chat_id}"}, room=chat_id)

@socketio.on("leave_chat")
def on_leave(data):
    chat_id = data.get("chat_id")
    leave_room(chat_id)
    socketio.emit("status", {"msg": f"user left chat {chat_id}"}, room=chat_id)


@socketio.on("send_message")
def handle_send_message(data):
    db = get_db()
    user_id, error, status = require_user(db, type="socket")
    if error:
        emit("error", {"reason": "unauthorized"})
        return

    chat_id = data.get("chat_id")
    msg = data.get("message")
    if not chat_id or not msg:
        emit("error", {"reason": "missing chat_id or message"})
        return

    if not require_chat_access(db, user_id, chat_id):
        emit("error", {"reason": "forbidden"})
        return

    msg_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO messages (id, sender_id, chat_id, content) VALUES (?, ?, ?, ?)",
        (msg_id, user_id, chat_id, msg)
    )
    db.commit()

    cursor.execute(
        "SELECT timestamp FROM messages WHERE id = ?",
        (msg_id,)
    )

    row = cursor.fetchone()
    timestamp = row["timestamp"]

    emit(
        "new_message",
        {
            "message_id": msg_id,
            "sender_id": user_id,
            "chat_id": chat_id,
            "content": msg,
            "timestamp": timestamp
        },
        room=chat_id
    )



# keeping old rest api for now :3
@chats_bp.post("/message")
def message():
    data = request.json
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    msg = data.get("message")
    chat_id = data.get("chat_id")
    if not chat_id or not msg:
        return jsonify(ok=False, reason="missing chat_id or message")

    if not require_chat_access(db, user_id, chat_id):
        return jsonify(ok=False, reason="forbidden"), 403

    msg_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO messages (id, sender_id, chat_id, content) VALUES (?, ?, ?, ?)",
        (msg_id, user_id, chat_id, msg)
    )
    db.commit()
    return jsonify(ok=True)


@chats_bp.get("/messages")
def get_messages():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    chat_id = request.args.get("chat_id")
    if not chat_id:
        return jsonify(ok=False, reason="missing chat_id")

    if not require_chat_access(db, user_id, chat_id):
        return jsonify(ok=False, reason="forbidden"), 403

    message_rows = db.execute(
        "SELECT id, sender_id, chat_id, content, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC",
        (chat_id,)
    ).fetchall()

    messages = [
        {"message_id": r[0], "sender_id": r[1], "chat_id": r[2], "content": r[3], "timestamp": r[4]}
        for r in message_rows
    ]
    return jsonify(messages=messages)
