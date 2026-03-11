from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO

from app import create_app, socketio

import sys

if __name__ == "__main__":
    testing = "--test" in sys.argv
    app = create_app(testing=testing, db_path=":memory:" if testing else "data.db")

    if testing:
        print("starting in-memory test suite...")

        with app.test_client() as client:

            print("\n=== USERS TESTS ===")
            # 1. register new user
            r = client.post("/users/register", json={"username": "testuser", "password": "123"})
            print("[test 1] register success:", r.status_code, r.get_json())
            assert r.status_code == 200
            assert r.get_json()["ok"] is True

            # 2. register duplicate user
            r = client.post("/users/register", json={"username": "testuser", "password": "123"})
            print("[test 2] register duplicate username:", r.status_code, r.get_json())
            assert r.status_code == 200  
            assert r.get_json()["ok"] is False

            # 3. login with wrong username
            r = client.post("/users/login", json={"username": "wronguser", "password": "123"})
            print("[test 3] login bad username:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is False

            # 4. login with wrong password
            r = client.post("/users/login", json={"username": "testuser", "password": "wrongpass"})
            print("[test 4] login bad password:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is False

            # 5. successful login
            r = client.post("/users/login", json={"username": "testuser", "password": "123"})
            login_data = r.get_json()
            print("[test 5] login success:", r.status_code, login_data)
            assert login_data["ok"] is True
            token = login_data["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
        
            # 6. edit bio
            r = client.patch("/users/edit", json={"bio": "Hello world"}, headers=headers)
            print("[test 6] edit bio:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 7. edit username to something new
            r = client.patch("/users/edit", json={"username": "newname"}, headers=headers)
            print("[test 7] edit username:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 8. edit username to duplicate (should fail)
            client.post("/users/register", json={"username": "anotheruser", "password": "123"})
            r = client.patch("/users/edit", json={"username": "anotheruser"}, headers=headers)
            print("[test 8] edit username duplicate:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is False

            print("\n=== CHAT & SERVER TESTS ===")
            # 9. create server
            r = client.post("/servers/create", json={"name": "Test Server"}, headers=headers)
            server_data = r.get_json()
            print("[test 9] create server:", r.status_code, server_data)
            assert server_data["ok"] is True
            server_id = server_data["server_id"]

            # 10. get invite code
            r = client.get(f"/servers/invite?server_id={server_id}", headers=headers)
            invite_data = r.get_json()
            print("[test 10] get invite:", r.status_code, invite_data)
            assert invite_data["ok"] is True
            invite = invite_data["invite"]

            # 11. join from invite as a current member
            r = client.post(f"/servers/join?invite={invite}", headers=headers)
            join_data = r.get_json()
            print("[test 11] join server as existing member:", r.status_code, join_data)
            assert join_data["ok"] is False

            #12. join from invite as new user
            r = client.post("/users/login", json={"username": "anotheruser", "password": "123"})
            login_data = r.get_json()
            r = client.post(f"/servers/join?invite={invite}", headers={"Authorization": f"Bearer {login_data["token"]}"})
            join_data = r.get_json()
            print("[test 12] join server as new member:", r.status_code, join_data)
            assert join_data["ok"] is True

            # 12. create chat in server
            r = client.post("/chats/create", json={"name": "general", "server_id": server_id}, headers=headers)
            chat_data = r.get_json()
            print("[test 12] create chat:", r.status_code, chat_data)
            assert chat_data["ok"] is True
            chat_id = chat_data["chat_id"]

            # 13. send message
            r = client.post("/chats/message", json={"chat_id": chat_id, "message": "Hello!"}, headers=headers)
            print("[test 13] send message:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 14. get messages
            r = client.get(f"/chats/messages?chat_id={chat_id}", headers=headers)
            print("[test 14] get messages:", r.status_code, r.get_json())
            messages = r.get_json()["messages"]
            assert len(messages) == 1
            assert messages[0]["content"] == "Hello!"

            print("\n=== PROFILE PICTURE TESTS ===")
            # 15. default pfp
            r = client.get(f"/pfps/default?id={login_data['user_id']}")
            print("[test 15] default pfp:", r.status_code)
            assert r.status_code == 200

            print("\nall in-memory tests passed successfully!")

    else: 
        CORS(app)
        #app.run(port=20349, debug=True)
        socketio.run(app, port=20349, debug=True)
