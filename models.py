from datetime import datetime

from sqlalchemy import case, func

from extensions import db


class Tiempo(db.Model):
    __tablename__ = "dim_Tiempo"

    fecha_id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False, unique=True)
    dia = db.Column(db.Integer, nullable=False)
    mes = db.Column(db.Integer, nullable=False)
    anio = db.Column(db.Integer, nullable=False)
    trimestre = db.Column(db.Integer, nullable=False)
    semana = db.Column(db.Integer, nullable=False)
    nombre_mes = db.Column(db.String(20), nullable=False)
    nombre_dia = db.Column(db.String(20), nullable=False)

    movimientos = db.relationship("Movimiento", back_populates="tiempo")


class Obra(db.Model):
    __tablename__ = "dim_Obras"

    obra_id = db.Column(db.Integer, primary_key=True)
    nombre_obra = db.Column(db.String(150), nullable=False)
    ubicacion = db.Column(db.String(150), nullable=False)
    ciudad = db.Column(db.String(50), nullable=False)
    presupuesto_total = db.Column(db.Numeric(15, 2), nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="activa")
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_cierre = db.Column(db.Date, nullable=True)
    responsable = db.Column(db.String(100))
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    movimientos = db.relationship("Movimiento", back_populates="obra")


class Material(db.Model):
    __tablename__ = "dim_Materiales"

    material_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    unidad = db.Column(db.String(20), nullable=False)
    costo_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    categoria = db.Column(db.String(50), nullable=False)
    stock_minimo = db.Column(db.Integer, default=0)
    stock_maximo = db.Column(db.Integer, default=1000)
    descripcion = db.Column(db.String(200))
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    movimientos = db.relationship("Movimiento", back_populates="material")


class Movimiento(db.Model):
    __tablename__ = "FACT_Movimientos"

    movimiento_id = db.Column(db.Integer, primary_key=True)
    obra_id = db.Column(db.Integer, db.ForeignKey("dim_Obras.obra_id"), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey("dim_Materiales.material_id"), nullable=False)
    fecha_id = db.Column(db.Integer, db.ForeignKey("dim_Tiempo.fecha_id"), nullable=False)
    cantidad = db.Column(db.Numeric(10, 2), nullable=False)
    tipo_movimiento = db.Column(db.String(10), nullable=False)  # ENTRADA o SALIDA
    costo_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    costo_total = db.Column(db.Numeric(15, 2), nullable=False)
    observaciones = db.Column(db.String(255))
    lote = db.Column(db.String(50))
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)

    obra = db.relationship("Obra", back_populates="movimientos")
    material = db.relationship("Material", back_populates="movimientos")
    tiempo = db.relationship("Tiempo", back_populates="movimientos")


def stock_por_material_subquery():
    """Subconsulta con el stock actual (entradas - salidas) por material_id.

    SQL Server exige que GROUP BY incluya todas las columnas no agregadas,
    por eso se agrupa aparte y luego se hace JOIN contra dim_Materiales.
    """
    return (
        db.session.query(
            Movimiento.material_id.label("material_id"),
            func.coalesce(
                func.sum(
                    case(
                        (Movimiento.tipo_movimiento == "ENTRADA", Movimiento.cantidad),
                        else_=-Movimiento.cantidad,
                    )
                ),
                0,
            ).label("stock_actual"),
        )
        .group_by(Movimiento.material_id)
        .subquery()
    )
