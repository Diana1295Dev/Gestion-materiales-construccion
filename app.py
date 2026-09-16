import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import Config
from extensions import db

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")


def _migrar_columnas_nuevas():
    """Agrega columnas nuevas a tablas ya existentes (db.create_all() solo
    crea tablas que faltan, no agrega columnas a las que ya existen).
    """
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    columnas_existentes = {col["name"] for col in inspector.get_columns("dim_Materiales")}

    nuevas_columnas = {
        "tiempo_reposicion_dias": "INTEGER DEFAULT 15",
        "lote_compra": "INTEGER DEFAULT 100",
    }
    for nombre, definicion in nuevas_columnas.items():
        if nombre not in columnas_existentes:
            db.session.execute(text(f"ALTER TABLE dim_Materiales ADD {nombre} {definicion}"))
    db.session.commit()


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

    @app.route("/api/health/db")
    def health_db():
        from sqlalchemy import text

        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({"db_status": "ok"})
        except Exception as exc:
            return jsonify(
                {
                    "db_status": "error",
                    "error_type": type(exc).__name__,
                    "error_message": str(exc)[:500],
                }
            ), 500

    @app.route("/api/setup/init-db")
    def setup_init_db():
        from datetime import date, timedelta
        from flask import request
        from models import Tiempo

        if request.args.get("key") != app.config["SECRET_KEY"]:
            return jsonify({"error": "No autorizado."}), 403

        db.create_all()
        _migrar_columnas_nuevas()

        meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
        ]
        dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]

        existentes = {t.fecha_id for t in Tiempo.query.with_entities(Tiempo.fecha_id).all()}

        actual = date(2023, 1, 1)
        fin = date(2030, 12, 31)
        insertados = 0
        while actual <= fin:
            fecha_id = int(actual.strftime("%Y%m%d"))
            if fecha_id not in existentes:
                db.session.add(
                    Tiempo(
                        fecha_id=fecha_id,
                        fecha=actual,
                        dia=actual.day,
                        mes=actual.month,
                        anio=actual.year,
                        trimestre=(actual.month - 1) // 3 + 1,
                        semana=actual.isocalendar()[1],
                        nombre_mes=meses[actual.month - 1],
                        nombre_dia=dias[actual.weekday()],
                    )
                )
                insertados += 1
            actual += timedelta(days=1)
        db.session.commit()

        return jsonify({"status": "ok", "fechas_insertadas": insertados, "fechas_existentes": len(existentes)})

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
