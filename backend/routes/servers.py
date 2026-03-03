from flask import Blueprint, request, jsonify
import sqlite3, uuid
from utils import get_db, require_user, generate_invite_code

servers_bp = Blueprint("servers", __name__)

@servers_bp.post("/create")
def create_server():
    data = request.json
    name = data.get("name")
    if not name:
        return jsonify(ok=False, reason="missing name")

    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    code = generate_invite_code()

    server_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO servers (id, name, owner_id, invite) VALUES (?, ?, ?, ?)",
        (server_id, name, user_id, code)
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
    return jsonify(servers=servers, ok=True)

@servers_bp.get("/get")
def get_server():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    server_id = request.args.get("server_id")
    if not server_id: 
        return jsonify(ok=False, reason="missing server_id")

    rows = db.execute(
        "SELECT servers.id, servers.name, servers.owner_id, servers.created_at "
        "FROM servers JOIN server_members ON servers.id = server_members.server_id "
        "WHERE server_members.user_id = ? AND servers.id = ?",
        (user_id, server_id)
    ).fetchall()

    servers = [
        {"id": r[0], "name": r[1], "owner_id": r[2], "created_at": r[3]}
        for r in rows
    ]
    return jsonify(servers=servers, ok=True)

@servers_bp.get("/invite")
def get_invite():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    server_id = request.args.get("server_id")
    if not server_id:
        return jsonify(ok=False, reason="missing server_id"), 400

    row = db.execute(
        "SELECT servers.invite "
        "FROM servers "
        "JOIN server_members ON servers.id = server_members.server_id "
        "WHERE server_members.user_id = ? AND servers.id = ?",
        (user_id, server_id)
    ).fetchone()

    if row is None:
        return jsonify(ok=False, reason="not a member or server not found"), 403

    invite = row["invite"] if isinstance(row, dict) else row[0]

    return jsonify(invite=invite, ok=True), 200

@servers_bp.post("/join")
def join_server():
    db = get_db()
    user_id, error, status = require_user(db)

    if error:
        return error, status
    
    invite = request.args.get("invite")
    if not invite:
        return jsonify(ok=False, reason="missing invite code")
    
    server = db.execute("SELECT id from servers WHERE invite = ?", (invite,)).fetchone()

    if server is None:
        return jsonify(ok=False, reason="invite is invalid")
    
    server_id = server["id"] if isinstance(server, dict) else server[0]

    existing = db.execute("SELECT 1 FROM server_members WHERE user_id = ? AND server_id = ?", (user_id, server_id)).fetchone()
    
    if existing:
        return jsonify(ok=False, reason="already a member"), 400

    db.execute("INSERT INTO server_members (user_id, server_id) VALUES (?, ?)", (user_id, server_id))
    db.commit()

    return jsonify(ok=True)

