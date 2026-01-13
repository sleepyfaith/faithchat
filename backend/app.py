from flask import Flask
from flask_cors import CORS
from routes.users import users_bp
from routes.servers import servers_bp
from routes.chats import chats_bp
from routes.pfps import pfps_bp

from utils import close_db, init_db

app = Flask(__name__)
CORS(app)

init_db()

app.register_blueprint(users_bp, url_prefix="/users")
app.register_blueprint(servers_bp, url_prefix="/servers")
app.register_blueprint(chats_bp, url_prefix="/chats")
app.register_blueprint(pfps_bp, url_prefix="/pfps")

app.teardown_appcontext(close_db)

if __name__ == "__main__":
    app.run(port=20349, debug=True)
