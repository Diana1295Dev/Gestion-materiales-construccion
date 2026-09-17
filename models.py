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

    def to_dict(self):
        return {"fecha_id": self.fecha_id, "fecha": self.fecha.isoformat()}


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

    def to_dict(self, gasto_acumulado=None):
        data = {
            "obra_id": self.obra_id,
            "nombre_obra": self.nombre_obra,
            "ubicacion": self.ubicacion,
            "ciudad": self.ciudad,
            "presupuesto_total": float(self.presupuesto_total),
            "estado": self.estado,
            "fecha_inicio": self.fecha_inicio.isoformat(),
            "fecha_cierre": self.fecha_cierre.isoformat() if self.fecha_cierre else None,
            "responsable": self.responsable,
        }
        if gasto_acumulado is not None:
            data["gasto_acumulado"] = float(gasto_acumulado)
        return data


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

    @property
    def tiempo_reposicion_dias(self):
        return 15

    @tiempo_reposicion_dias.setter
    def tiempo_reposicion_dias(self, value):
        pass

    @property
    def lote_compra(self):
        return 100

    @lote_compra.setter
    def lote_compra(self, value):
        pass

    def to_dict(self, stock_actual=None):
        data = {
            "material_id": self.material_id,
            "nombre": self.nombre,
            "unidad": self.unidad,
            "costo_unitario": float(self.costo_unitario),
            "categoria": self.categoria,
            "stock_minimo": self.stock_minimo,
            "stock_maximo": self.stock_maximo,
            "tiempo_reposicion_dias": self.tiempo_reposicion_dias,
            "lote_compra": self.lote_compra,
            "descripcion": self.descripcion,
        }
        if stock_actual is not None:
            data["stock_actual"] = float(stock_actual)
        return data


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

    def to_dict(self):
        return {
            "movimiento_id": self.movimiento_id,
            "tipo_movimiento": self.tipo_movimiento,
            "cantidad": float(self.cantidad),
            "costo_unitario": float(self.costo_unitario),
            "costo_total": float(self.costo_total),
            "observaciones": self.observaciones,
            "lote": self.lote,
            "fecha": self.tiempo.fecha.isoformat(),
            "obra": {"obra_id": self.obra.obra_id, "nombre_obra": self.obra.nombre_obra},
            "material": {
                "material_id": self.material.material_id,
                "nombre": self.material.nombre,
                "unidad": self.material.unidad,
            },
        }


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


def gasto_por_obra_subquery():
    """Subconsulta con el gasto acumulado (suma de costo_total de todos los movimientos) por obra_id.

    Se cuenta tanto ENTRADA como SALIDA porque ambos representan materiales
    que ya se compraron/consumieron con cargo al presupuesto de la obra.
    """
    return (
        db.session.query(
            Movimiento.obra_id.label("obra_id"),
            func.coalesce(func.sum(Movimiento.costo_total), 0).label("gasto_acumulado"),
        )
        .group_by(Movimiento.obra_id)
        .subquery()
    )
