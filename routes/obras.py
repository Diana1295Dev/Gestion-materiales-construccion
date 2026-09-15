from datetime import datetime

from flask import Blueprint, jsonify, request

from extensions import db
from models import Obra, gasto_por_obra_subquery

bp = Blueprint("obras", __name__, url_prefix="/api/obras")

ESTADOS = ["activa", "completada", "suspendida"]


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date() if value else None


def _obra_from_payload(payload, obra=None):
    obra = obra or Obra()
    obra.nombre_obra = payload["nombre_obra"].strip()
    obra.ubicacion = payload["ubicacion"].strip()
    obra.ciudad = payload["ciudad"].strip()
    obra.presupuesto_total = payload["presupuesto_total"]
    obra.estado = payload.get("estado", "activa")
    obra.fecha_inicio = _parse_date(payload["fecha_inicio"])
    obra.fecha_cierre = _parse_date(payload.get("fecha_cierre"))
    obra.responsable = (payload.get("responsable") or "").strip()
    return obra


@bp.route("", methods=["GET"])
def index():
    estado = request.args.get("estado")
    query = Obra.query
    if estado:
        query = query.filter_by(estado=estado)
    obras = query.order_by(Obra.fecha_creacion.desc()).all()

    gasto_subq = gasto_por_obra_subquery()
    gasto_map = dict(
        db.session.query(gasto_subq.c.obra_id, gasto_subq.c.gasto_acumulado).all()
    )

    return jsonify([o.to_dict(gasto_acumulado=gasto_map.get(o.obra_id, 0)) for o in obras])


@bp.route("/<int:obra_id>", methods=["GET"])
def detalle(obra_id):
    obra = Obra.query.get_or_404(obra_id)
    gasto_subq = gasto_por_obra_subquery()
    gasto = (
        db.session.query(gasto_subq.c.gasto_acumulado)
        .filter(gasto_subq.c.obra_id == obra_id)
        .scalar()
        or 0
    )
    return jsonify(obra.to_dict(gasto_acumulado=gasto))


@bp.route("", methods=["POST"])
def crear():
    payload = request.get_json(force=True) or {}
    try:
        obra = _obra_from_payload(payload)
        db.session.add(obra)
        db.session.commit()
        return jsonify(obra.to_dict()), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@bp.route("/<int:obra_id>", methods=["PUT"])
def actualizar(obra_id):
    obra = Obra.query.get_or_404(obra_id)
    payload = request.get_json(force=True) or {}
    try:
        _obra_from_payload(payload, obra=obra)
        db.session.commit()
        return jsonify(obra.to_dict())
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@bp.route("/<int:obra_id>", methods=["DELETE"])
def eliminar(obra_id):
    obra = Obra.query.get_or_404(obra_id)
    if obra.movimientos:
        return jsonify({"error": "No se puede eliminar: la obra tiene movimientos registrados."}), 409

    db.session.delete(obra)
    db.session.commit()
    return jsonify({"ok": True})
