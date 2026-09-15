import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


def _build_db_uri() -> str:
    # Modo Render (PostgreSQL): si existe DATABASE_URL, se usa directamente.
    # Render la genera sola al crear una base de datos Postgres gestionada.
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return database_url

    server = os.environ.get("DB_SERVER", r"localhost\SQLEXPRESS")
    database = os.environ.get("DB_NAME", "InventarioConstruccion")
    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASSWORD")

    if user and password:
        # Modo nube (Azure SQL, Vercel, etc.): autenticacion SQL con usuario/contrasena,
        # via pymssql. Es un driver 100% Python, sin dependencias del sistema operativo,
        # por eso funciona en entornos serverless donde no se puede instalar el driver ODBC.
        port = os.environ.get("DB_PORT", "1433")
        return (
            f"mssql+pymssql://{quote_plus(user)}:{quote_plus(password)}"
            f"@{server}:{port}/{quote_plus(database)}"
        )

    # Modo local (Windows + SQL Server Express): autenticacion de Windows via pyodbc.
    driver = os.environ.get("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    odbc_str = (
        f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};"
        "TrustServerCertificate=yes;Trusted_Connection=yes;"
    )
    return f"mssql+pyodbc:///?odbc_connect={quote_plus(odbc_str)}"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key")
    SQLALCHEMY_DATABASE_URI = _build_db_uri()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
