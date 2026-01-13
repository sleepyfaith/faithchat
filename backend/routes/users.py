from flask import Blueprint, request, jsonify, g
import sqlite3, uuid
from passlib.hash import argon2

from utils import get_db, require_user

users_bp = Blueprint("users", __name__)

@users_bp.post("/register")
def register():
    data = request.json
    username = data["username"]
    password = data["password"]

    USERID = str(uuid.uuid4())
    HASH = argon2.hash(password)

    db = get_db()
    cursor = db.cursor()


    try:
        cursor.execute(
            "INSERT INTO users (id, username, hash) VALUES (?, ?, ?)",
            (USERID, username, HASH)
        )
    except sqlite3.IntegrityError:
        return jsonify(ok=False, reason="username taken")

    db.commit()
    return jsonify(ok=True)


@users_bp.post("/login")
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    db = get_db()
    cursor = db.cursor()

    row = cursor.execute(
        "SELECT id, hash FROM users WHERE username=?",
        (username,)
    ).fetchone()

    if row and argon2.verify(password, row[1]):
        token = str(uuid.uuid4())
        user_id = row[0]

        cursor.execute("INSERT INTO sessions VALUES (?, ?)", (user_id, token))
        db.commit()
        return jsonify(ok=True, token=token, user_id=user_id)

    return jsonify(ok=False)


@users_bp.patch("/edit_user")
def edit_user():
    data = request.json
    bio = data.get("bio")
    username = data.get("username")

    db = get_db()
    cursor = db.cursor()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    try:
        db.execute("BEGIN")

        if username is not None:
            existing = cursor.execute(
                "SELECT id FROM users WHERE username = ? AND id != ?",
                (username, user_id)
            ).fetchone()
            if existing:
                db.execute("ROLLBACK")
                return jsonify(ok=False, reason="username taken"), 409

            cursor.execute(
                "UPDATE users SET username = ? WHERE id = ?",
                (username, user_id)
            )

        if bio is not None:
            if bio == "":
                cursor.execute(
                    "UPDATE users SET about = NULL WHERE id = ?",
                    (user_id,)
                )
            else:
                cursor.execute(
                    "UPDATE users SET about = ? WHERE id = ?",
                    (bio, user_id)
                )

        db.commit()
    except sqlite3.Error as e:
        db.execute("ROLLBACK")
        return jsonify(ok=False, reason="database_error", detail=str(e)), 500

    return jsonify(ok=True)


@users_bp.get("/user")
def get_user():
    user_id = request.args.get("id")
    if not user_id:
        return jsonify(ok=False, reason="missing id")

    db = get_db()
    cursor = db.cursor()
    row = cursor.execute(
        "SELECT id, username, pfp_id, about, created_at FROM users WHERE id=?",
        (user_id,)
    ).fetchone()

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
