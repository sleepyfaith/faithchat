from flask import Blueprint, request, send_file, jsonify
import os, io, mimetypes
from utils import get_db, require_user
from generate_pfp import generate_user_pfp

pfps_bp = Blueprint("pfps", __name__)

@pfps_bp.post("/update_pfp")
def update_pfp():
    db = get_db()
    user_id, error, status = require_user(db)
    if error:
        return error, status

    if "image" not in request.files:
        return jsonify(ok=False, reason="no image file provided")

    image = request.files["image"]
    if image.filename == "":
        return jsonify(ok=False, reason="empty filename")

    ext = image.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        return jsonify(ok=False, reason="invalid file type")

    filename = f"{user_id}.{ext}"
    os.makedirs("pfp_storage", exist_ok=True)
    filepath = os.path.join("pfp_storage", filename)
    image.save(filepath)

    db.execute("UPDATE users SET pfp_id=? WHERE id=?", (filename, user_id))
    db.commit()
    return jsonify(ok=True, pfp_id=filename)


@pfps_bp.get("/pfp")
def get_pfp():
    pfp_id = request.args.get("id")
    if not pfp_id:
        return "missing pfp id", 400

    pfp_filename = os.path.join("pfp_storage", pfp_id)
    if not os.path.isfile(pfp_filename):
        return "no pfp exists", 401

    mimetype, _ = mimetypes.guess_type(pfp_filename)
    return send_file(pfp_filename, mimetype=mimetype or "application/octet-stream")


@pfps_bp.get("/default_pfp")
def get_default_pfp():
    user_id = request.args.get("id")
    if not user_id:
        return "missing user id", 400

    img = generate_user_pfp(user_id)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")
