import sqlite3
import secrets
import string
import hashlib
import os
from flask import g, request, jsonify, current_app
from PIL import Image, ImageDraw, ImageFont


def init_db(app):
    with app.app_context():

        database = get_db()
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
            invite TEXT NOT NULL, 
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

def get_db():
    if 'db' not in g:

        if current_app.config["DATABASE"] == ":memory:":
            if current_app.config["_DB_CONN"] is None:
                conn = sqlite3.connect(":memory:")
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON;")
                current_app.config["_DB_CONN"] = conn
            g.db = current_app.config["_DB_CONN"]
        else:
            g.db = sqlite3.connect(current_app.config["DATABASE"])
            g.db.row_factory = sqlite3.Row
            g.db.execute("PRAGMA foreign_keys = ON;")

    return g.db

def close_db(exception): 
    db = g.pop('db', None)
    if db is not None and current_app.config["DATABASE"] != ":memory:":
        db.close()

def require_user(db, type="http"):

    if type not in ["http", "socket"]:
        print("type must be either http or socket")
    
    elif type == "http":
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None, jsonify(ok=False, reason="missing_token"), 401
        token = auth.split(" ", 1)[1]
        
    else: # socket 
        token = request.environ.get("token")
        if not token:
            return None, jsonify(ok=False, reason="missing_token"), 401

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

def generate_invite_code(length=8):
    characters = string.ascii_lowercase + string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def get_user_colours(uuid):
    h = hashlib.sha256(uuid.encode()).digest()
    r1, g1, b1, r2, g2, b2 = h[:6]

    color1 = (r1, g1, b1)
    color2 = (r2, g2, b2)

    print(h, color1, color2)

    return color1, color2

def pick_text_color(color1, color2):
    def brightness(rgb):
        r, g, b = rgb
        return 0.299*r + 0.587*g + 0.114*b
    
    avg = (brightness(color1) + brightness(color2)) / 2
    return "black" if avg > 50 else "white"

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(3))

def generate_user_pfp(uuid, size=128):
    color1, color2 = get_user_colours(uuid)
    text_color = pick_text_color(color1, color2)

    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        ratio = y / (size-1)
        color = lerp_color(color1, color2, ratio)
        draw.line([(0, y), (size, y)], fill=color)
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    font_path = os.path.join(BASE_DIR, "static", "fonts", "Quicksand-Regular.ttf")

    font = ImageFont.truetype(font_path, int(size*0.5))
    text = ":3"
    
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]    

    draw.text(((size-w)/2, (size-h)/4), text, font=font, fill=text_color)
    
    return img
