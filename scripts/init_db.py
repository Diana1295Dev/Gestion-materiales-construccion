"""Crea la base de datos InventarioConstruccion (si no existe), sus tablas
y precarga la dimension de tiempo. Ejecutar una sola vez al inicio:

    python scripts/init_db.py
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pyodbc
from dotenv import load_dotenv

load_dotenv()

DB_SERVER = os.environ.get("DB_SERVER", r"localhost\SQLEXPRESS")
DB_NAME = os.environ.get("DB_NAME", "InventarioConstruccion")
DB_DRIVER = os.environ.get("DB_DRIVER", "ODBC Driver 17 for SQL Server")
DB_USER = os.environ.get("DB_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD")

SCHEMA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Gestion_de_materiales.sql",
)

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
DIAS = [
    "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo",
]


def _conn_str(database: str) -> str:
    base = f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={database};TrustServerCertificate=yes;"
    if DB_USER and DB_PASSWORD:
        return base + f"UID={DB_USER};PWD={DB_PASSWORD};"
    return base + "Trusted_Connection=yes;"


def ensure_database():
    conn = pyodbc.connect(_conn_str("master"), autocommit=True)
    cursor = conn.cursor()
    cursor.execute(
        "IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = ?) "
        "EXEC('CREATE DATABASE [" + DB_NAME + "]')",
        DB_NAME,
    )
    conn.close()
    print(f"[ok] Base de datos '{DB_NAME}' verificada/creada.")


def ensure_tables():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        script = f.read()

    batches = [b.strip() for b in script.split("\nGO") if b.strip()]
    conn = pyodbc.connect(_conn_str(DB_NAME), autocommit=True)
    cursor = conn.cursor()
    for batch in batches:
        if "CREATE DATABASE" in batch.upper():
            continue
        try:
            cursor.execute(batch)
        except pyodbc.Error as exc:
            msg = str(exc)
            if "already an object named" in msg or "There is already an object" in msg:
                continue
            raise
    conn.close()
    print("[ok] Tablas verificadas/creadas.")


def seed_tiempo(start: date, end: date):
    conn = pyodbc.connect(_conn_str(DB_NAME), autocommit=True)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dim_Tiempo")
    existing = cursor.fetchone()[0]

    current = start
    inserted = 0
    while current <= end:
        fecha_id = int(current.strftime("%Y%m%d"))
        cursor.execute("SELECT 1 FROM dim_Tiempo WHERE fecha_id = ?", fecha_id)
        if not cursor.fetchone():
            trimestre = (current.month - 1) // 3 + 1
            cursor.execute(
                """
                INSERT INTO dim_Tiempo
                    (fecha_id, fecha, dia, mes, anio, trimestre, semana, nombre_mes, nombre_dia)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                fecha_id,
                current,
                current.day,
                current.month,
                current.year,
                trimestre,
                current.isocalendar()[1],
                MESES[current.month - 1],
                DIAS[current.weekday()],
            )
            inserted += 1
        current += timedelta(days=1)
    conn.close()
    print(f"[ok] dim_Tiempo: {existing} fechas ya existian, {inserted} nuevas insertadas.")


if __name__ == "__main__":
    ensure_database()
    ensure_tables()
    seed_tiempo(date(2023, 1, 1), date(2030, 12, 31))
    print("Listo. La base de datos esta lista para usarse.")
