from flask import Blueprint, request, jsonify
import sqlite3, uuid
from utils import get_db, require_user, require_chat_access

chats_bp = Blueprint("chats", __name__)

@chats_bp.post("/create")
def create_chat():
    data = request.json
    server_id = data.get("server_id")
    name = data.get("name", "")
    if not server_id:
        return jsonify(ok=False, reason="missing server_id")

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
    return jsonify(ok=True, chat_id=chat_id)


@chats_bp.get("/")
def get_chats():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    chat_rows = db.execute(
        "SELECT chats.id, chats.name, chats.created_at, chats.created_by, chats.type, chats.admin_only "
        "FROM chats JOIN server_members ON server_members.server_id = chats.server_id "
        "WHERE server_members.user_id = ? ORDER BY chats.created_at ASC",
        (user_id,)
    ).fetchall()

    chats = [
        {"id": r[0], "name": r[1], "created_at": r[2], "created_by": r[3], "type": r[4], "admin_only": r[5]}
        for r in chat_rows
    ]
    return jsonify(chats=chats)


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
