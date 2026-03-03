from flask import Flask, request
from flask_socketio import SocketIO


socketio = SocketIO(cors_allowed_origins="*")

@socketio.on("connect")
def socket_connect(auth):
    if not auth or "token" not in auth:
        print("token invalid:", auth)
        return False  # reject connection
    request.environ["token"] = auth["token"]
    
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
    
    socketio.init_app(app)

    init_db(app)

    app.register_blueprint(users_bp, url_prefix="/users")
    app.register_blueprint(servers_bp, url_prefix="/servers")
    app.register_blueprint(chats_bp, url_prefix="/chats")
    app.register_blueprint(pfps_bp, url_prefix="/pfps")


    app.teardown_appcontext(close_db)

    return app