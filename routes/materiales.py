from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from models import Material, stock_por_material_subquery

bp = Blueprint("materiales", __name__, url_prefix="/api/materiales")

UNIDADES = ["kg", "m3", "m2", "unidad", "bolsa", "litro", "varilla", "rollo"]
CATEGORIAS = ["Estructural", "Acabados", "Fundacion", "Instalaciones", "Herramientas"]


def _material_from_payload(payload, material=None):
    material = material or Material()
    material.nombre = payload["nombre"].strip()
    material.unidad = payload["unidad"]
    material.costo_unitario = payload["costo_unitario"]
    material.categoria = payload["categoria"]
    material.stock_minimo = payload.get("stock_minimo") or 0
    material.stock_maximo = payload.get("stock_maximo") or 1000
    material.descripcion = (payload.get("descripcion") or "").strip()
    return material


def _stock_map():
    stock_subq = stock_por_material_subquery()
    rows = (
        db.session.query(Material, func.coalesce(stock_subq.c.stock_actual, 0))
        .outerjoin(stock_subq, stock_subq.c.material_id == Material.material_id)
        .order_by(Material.nombre)
        .all()
    )
    return rows


@bp.route("", methods=["GET"])
def index():
    rows = _stock_map()
    return jsonify([m.to_dict(stock_actual=stock) for m, stock in rows])


@bp.route("/<int:material_id>", methods=["GET"])
def detalle(material_id):
    material = Material.query.get_or_404(material_id)
    return jsonify(material.to_dict())


@bp.route("", methods=["POST"])
def crear():
    payload = request.get_json(force=True) or {}
    try:
        material = _material_from_payload(payload)
        db.session.add(material)
        db.session.commit()
        return jsonify(material.to_dict()), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@bp.route("/<int:material_id>", methods=["PUT"])
def actualizar(material_id):
    material = Material.query.get_or_404(material_id)
    payload = request.get_json(force=True) or {}
    try:
        _material_from_payload(payload, material=material)
        db.session.commit()
        return jsonify(material.to_dict())
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@bp.route("/<int:material_id>", methods=["DELETE"])
def eliminar(material_id):
    material = Material.query.get_or_404(material_id)
    if material.movimientos:
        return jsonify({"error": "No se puede eliminar: el material tiene movimientos registrados."}), 409

    db.session.delete(material)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/opciones", methods=["GET"])
def opciones():
    return jsonify({"unidades": UNIDADES, "categorias": CATEGORIAS})
