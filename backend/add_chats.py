import sqlite3
import uuid

database = sqlite3.connect("data.db")
cursor = database.cursor()

# 1. Create default chat
default_chat_id = str(uuid.uuid4())
cursor.execute("""
INSERT INTO chats (id, name, created_by, type)
VALUES (?, ?, ?, ?)
""", (default_chat_id, "general", None, "private"))

# 2. Add chat_id column as nullable
cursor.execute("ALTER TABLE messages ADD COLUMN chat_id TEXT")

# 3. Update all existing messages to point to default chat
cursor.execute("""
UPDATE messages
SET chat_id = ?
WHERE chat_id IS NULL OR chat_id = ''
""", (default_chat_id,))

database.commit()
print(f"Assigned default chat ID {default_chat_id} to all existing messages.")
database.close()
