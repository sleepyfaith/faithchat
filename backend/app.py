from flask import Flask
from flask_cors import CORS
import sys



def create_app(testing=False, db_path="data.db"):
    from routes.users import users_bp
    from routes.servers import servers_bp
    from routes.chats import chats_bp
    from routes.pfps import pfps_bp
    from utils import close_db, init_db

    app = Flask(__name__)
    app.config["TESTING"] = testing
    app.config["DATABASE"] = db_path

    app.config["_DB_CONN"] = None

    init_db(app)

    app.register_blueprint(users_bp, url_prefix="/users")
    app.register_blueprint(servers_bp, url_prefix="/servers")
    app.register_blueprint(chats_bp, url_prefix="/chats")
    app.register_blueprint(pfps_bp, url_prefix="/pfps")

    app.teardown_appcontext(close_db)

    return app

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
            r = client.patch("/users/edit_user", json={"bio": "Hello world"}, headers=headers)
            print("[test 6] edit bio:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 7. edit username to something new
            r = client.patch("/users/edit_user", json={"username": "newname"}, headers=headers)
            print("[test 7] edit username:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 8. edit username to duplicate (should fail)
            client.post("/users/register", json={"username": "anotheruser", "password": "123"})
            r = client.patch("/users/edit_user", json={"username": "anotheruser"}, headers=headers)
            print("[test 8] edit username duplicate:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is False

            print("\n=== CHAT & SERVER TESTS ===")
            # 9. create server
            r = client.post("/servers/create", json={"name": "Test Server"}, headers=headers)
            server_data = r.get_json()
            print("[test 9] create server:", r.status_code, server_data)
            assert server_data["ok"] is True
            server_id = server_data["server_id"]

            # 10. create chat in server
            r = client.post("/chats/create", json={"name": "general", "server_id": server_id}, headers=headers)
            chat_data = r.get_json()
            print("[test 10] create chat:", r.status_code, chat_data)
            assert chat_data["ok"] is True
            chat_id = chat_data["chat_id"]

            # 11. send message
            r = client.post("/chats/message", json={"chat_id": chat_id, "message": "Hello!"}, headers=headers)
            print("[test 11] send message:", r.status_code, r.get_json())
            assert r.get_json()["ok"] is True

            # 12. get messages
            r = client.get(f"/chats/messages?chat_id={chat_id}", headers=headers)
            print("[test 12] get messages:", r.status_code, r.get_json())
            messages = r.get_json()["messages"]
            assert len(messages) == 1
            assert messages[0]["content"] == "Hello!"

            print("\n=== PROFILE PICTURE TESTS ===")
            # 13. default pfp
            r = client.get(f"/pfps/default_pfp?id={login_data['user_id']}")
            print("[test 13] default pfp:", r.status_code)
            assert r.status_code == 200

            print("\nall in-memory tests passed successfully!")

    else: 
        CORS(app)
        app.run(port=20349, debug=True)
