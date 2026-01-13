import sqlite3
from flask import g, request, jsonify

def init_db():
    database = sqlite3.connect("data.db", check_same_thread=False)
    database_cursor = database.cursor()
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL, 
        hash TEXT NOT NULL, 
        pfp_id TEXT, 
        about TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP )""") 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS servers(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL, 
        owner_id TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        FOREIGN KEY (owner_id) REFERENCES users(id) ) """) 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS chats(
        id TEXT PRIMARY KEY, name TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        created_by TEXT NOT NULL, 
        server_id TEXT NOT NULL, 
        type TEXT DEFAULT 'text', 
        admin_only BOOLEAN DEFAULT 0, 
        FOREIGN KEY (created_by) REFERENCES users(id), 
        FOREIGN KEY (server_id) REFERENCES servers(id) ) """) 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS messages( 
        id TEXT PRIMARY KEY, 
        sender_id TEXT NOT NULL, 
        chat_id TEXT NOT NULL, 
        content TEXT NOT NULL, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, 
        FOREIGN KEY (sender_id) REFERENCES users(id), 
        FOREIGN KEY (chat_id) REFERENCES chats(id) ) """) 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS sessions( 
        user_id TEXT NOT NULL, 
        token TEXT PRIMARY KEY, 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) ) """) 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS user_relationships( 
        user_id TEXT NOT NULL, 
        target_id TEXT NOT NULL, 
        type TEXT CHECK (type IN ('friend', 'blocked', 'pending')), 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        PRIMARY KEY (user_id, target_id), 
        FOREIGN KEY (user_id) REFERENCES users(id), 
        FOREIGN KEY (target_id) REFERENCES users(id) ) """) 
    database_cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS server_members(
        server_id TEXT NOT NULL, 
        user_id TEXT NOT NULL, 
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        PRIMARY KEY (server_id, user_id), 
        FOREIGN KEY (server_id) REFERENCES servers(id), 
        FOREIGN KEY (user_id) REFERENCES users(id) ) """)
     
    # indexes 

    # existing usernames
    database_cursor.execute(""" CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username); """) 
    # chat messages to speed up /messages call
    database_cursor.execute(""" CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages(chat_id, timestamp); """) 
    # relationship index
    database_cursor.execute(""" CREATE INDEX IF NOT EXISTS idx_relationships_user ON user_relationships(user_id); """) 

    database.commit() 
    database.close()

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect("data.db")
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON;")
    return g.db

def close_db(exception): 
    db = g.pop('db', None)
    if db is not None: 
        db.close()

def require_user(db):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, jsonify(ok=False, reason="missing_token"), 401

    token = auth.split(" ", 1)[1]
    row = db.execute("SELECT user_id FROM sessions WHERE token=?", (token,)).fetchone()
    if not row:
        return None, jsonify(ok=False, reason="invalid_token"), 401
    return row["user_id"], None, None

def require_chat_access(db, user_id, chat_id):
    row = db.execute(
        "SELECT 1 FROM chats "
        "JOIN server_members ON server_members.server_id = chats.server_id "
        "WHERE chats.id = ? AND server_members.user_id = ?",
        (chat_id, user_id)
    ).fetchone()
    return row is not None
