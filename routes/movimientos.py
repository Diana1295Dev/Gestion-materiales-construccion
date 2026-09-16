from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import case, func

from extensions import db
from models import Material, Movimiento, Obra, Tiempo
from routes.materiales import aplicar_stock_calculado

bp = Blueprint("movimientos", __name__, url_prefix="/api/movimientos")

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]


def _get_or_create_tiempo(fecha: date) -> Tiempo:
    fecha_id = int(fecha.strftime("%Y%m%d"))
    tiempo = Tiempo.query.get(fecha_id)
    if tiempo:
        return tiempo

    tiempo = Tiempo(
        fecha_id=fecha_id,
        fecha=fecha,
        dia=fecha.day,
        mes=fecha.month,
        anio=fecha.year,
        trimestre=(fecha.month - 1) // 3 + 1,
        semana=fecha.isocalendar()[1],
        nombre_mes=MESES[fecha.month - 1],
        nombre_dia=DIAS[fecha.weekday()],
    )
    db.session.add(tiempo)
    db.session.flush()
    return tiempo


def _stock_actual(material_id: int) -> float:
    total = (
        db.session.query(
            func.coalesce(
                func.sum(
                    case(
                        (Movimiento.tipo_movimiento == "ENTRADA", Movimiento.cantidad),
                        else_=-Movimiento.cantidad,
                    )
                ),
                0,
            )
        )
        .filter(Movimiento.material_id == material_id)
        .scalar()
    )
    return float(total or 0)


@bp.route("", methods=["GET"])
def index():
    query = Movimiento.query.join(Obra).join(Material).join(Tiempo)

    obra_id = request.args.get("obra_id", type=int)
    material_id = request.args.get("material_id", type=int)
    tipo = request.args.get("tipo")
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    limit = request.args.get("limit", default=300, type=int)

    if obra_id:
        query = query.filter(Movimiento.obra_id == obra_id)
    if material_id:
        query = query.filter(Movimiento.material_id == material_id)
    if tipo in ("ENTRADA", "SALIDA"):
        query = query.filter(Movimiento.tipo_movimiento == tipo)
    if desde:
        query = query.filter(Tiempo.fecha >= datetime.strptime(desde, "%Y-%m-%d").date())
    if hasta:
        query = query.filter(Tiempo.fecha <= datetime.strptime(hasta, "%Y-%m-%d").date())

    movimientos = query.order_by(Movimiento.fecha_registro.desc()).limit(limit).all()
    return jsonify([m.to_dict() for m in movimientos])


@bp.route("", methods=["POST"])
def crear():
    payload = request.get_json(force=True) or {}
    try:
        material = Material.query.get_or_404(int(payload["material_id"]))
        obra = Obra.query.get_or_404(int(payload["obra_id"]))
        tipo = payload["tipo_movimiento"]
        cantidad = float(payload["cantidad"])
        fecha = datetime.strptime(payload["fecha"], "%Y-%m-%d").date()
        costo_unitario = float(payload.get("costo_unitario") or material.costo_unitario)

        if tipo not in ("ENTRADA", "SALIDA"):
            raise ValueError("Tipo de movimiento invalido.")

        if cantidad <= 0:
            raise ValueError("La cantidad debe ser mayor a cero.")

        if tipo == "SALIDA":
            disponible = _stock_actual(material.material_id)
            if cantidad > disponible:
                raise ValueError(
                    f"Stock insuficiente: disponible {disponible:g} {material.unidad}, "
                    f"solicitado {cantidad:g} {material.unidad}."
                )

        tiempo = _get_or_create_tiempo(fecha)

        movimiento = Movimiento(
            obra_id=obra.obra_id,
            material_id=material.material_id,
            fecha_id=tiempo.fecha_id,
            cantidad=cantidad,
            tipo_movimiento=tipo,
            costo_unitario=costo_unitario,
            costo_total=round(cantidad * costo_unitario, 2),
            observaciones=(payload.get("observaciones") or "").strip(),
            lote=(payload.get("lote") or "").strip(),
        )
        db.session.add(movimiento)
        if tipo == "SALIDA":
            aplicar_stock_calculado(material)
        db.session.commit()
        return jsonify(movimiento.to_dict()), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400
