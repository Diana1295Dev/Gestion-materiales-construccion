import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import Config
from extensions import db

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    db.init_app(app)

    from routes.dashboard import bp as dashboard_bp
    from routes.obras import bp as obras_bp
    from routes.materiales import bp as materiales_bp
    from routes.movimientos import bp as movimientos_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(obras_bp)
    app.register_blueprint(materiales_bp)
    app.register_blueprint(movimientos_bp)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Sirve el frontend ya compilado (frontend/dist) para poder correr todo
    # con un solo proceso, ideal para uso en red local sin depender de la nube.
    if os.path.isdir(FRONTEND_DIST):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def frontend(path):
            if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=app.config["DEBUG"], threaded=True)
