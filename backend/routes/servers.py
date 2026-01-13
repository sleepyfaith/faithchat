from flask import Blueprint, request, jsonify
import sqlite3, uuid
from utils import get_db, require_user

servers_bp = Blueprint("servers", __name__)

@servers_bp.post("/create_server")
def create_server():
    data = request.json
    name = data.get("name")
    if not name:
        return jsonify(ok=False, reason="missing name")

    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    server_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO servers (id, name, owner_id) VALUES (?, ?, ?)",
        (server_id, name, user_id)
    )
    cursor.execute(
        "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
        (server_id, user_id)
    )

    db.commit()
    return jsonify(ok=True, server_id=server_id)


@servers_bp.get("/")
def list_servers():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    rows = db.execute(
        "SELECT servers.id, servers.name, servers.owner_id, servers.created_at "
        "FROM servers JOIN server_members ON servers.id = server_members.server_id "
        "WHERE server_members.user_id = ?",
        (user_id,)
    ).fetchall()

    servers = [
        {"id": r[0], "name": r[1], "owner_id": r[2], "created_at": r[3]}
        for r in rows
    ]
    return jsonify(servers=servers)
