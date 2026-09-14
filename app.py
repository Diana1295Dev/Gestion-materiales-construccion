from flask import Flask

from config import Config
from extensions import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from routes.dashboard import bp as dashboard_bp
    from routes.obras import bp as obras_bp
    from routes.materiales import bp as materiales_bp
    from routes.movimientos import bp as movimientos_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(obras_bp)
    app.register_blueprint(materiales_bp)
    app.register_blueprint(movimientos_bp)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=app.config["DEBUG"])
