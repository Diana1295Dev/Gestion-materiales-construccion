import statistics

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from models import Material, Movimiento, Tiempo, stock_por_material_subquery

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
    material.tiempo_reposicion_dias = payload.get("tiempo_reposicion_dias") or 15
    material.lote_compra = payload.get("lote_compra") or 100
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


@bp.route("/<int:material_id>/sugerencia-stock", methods=["GET"])
def sugerencia_stock(material_id):
    """Sugiere stock_minimo y stock_maximo con base en el historial real de
    salidas de este material (formula clasica de punto de reorden, no ML:
    con los pocos movimientos que suele haber al inicio, un modelo entrenado
    no tendria datos suficientes para aprender nada confiable).
    """
    material = Material.query.get_or_404(material_id)

    filas = (
        db.session.query(Tiempo.anio, Tiempo.mes, func.sum(Movimiento.cantidad).label("total"))
        .join(Tiempo, Tiempo.fecha_id == Movimiento.fecha_id)
        .filter(Movimiento.material_id == material_id, Movimiento.tipo_movimiento == "SALIDA")
        .group_by(Tiempo.anio, Tiempo.mes)
        .all()
    )

    totales_mensuales = [float(f.total) for f in filas]
    meses_con_datos = len(totales_mensuales)

    if meses_con_datos == 0:
        return jsonify(
            {
                "meses_con_datos": 0,
                "suficiente": False,
                "mensaje": "Aun no hay salidas registradas de este material; "
                "registra movimientos para poder sugerir un stock minimo/maximo.",
            }
        )

    consumo_promedio_mensual = statistics.mean(totales_mensuales)
    desviacion_estandar_mensual = statistics.stdev(totales_mensuales) if meses_con_datos >= 2 else 0.0

    # ---------------------------------------------------------------------
    # Formula de punto de reorden (inventario clasico, no ML):
    #
    #   Stock minimo = (Demanda diaria promedio x Tiempo de reposicion)
    #                  + Stock de seguridad
    #
    #   Stock de seguridad = Z_SERVICIO x Desviacion estandar diaria
    #                        x sqrt(Tiempo de reposicion)
    #
    # - Demanda diaria promedio / Desviacion estandar diaria: se derivan del
    #   consumo mensual observado (consumo_promedio_mensual y
    #   desviacion_estandar_mensual), asumiendo DIAS_POR_MES dias por mes.
    # - Tiempo de reposicion: dias que tarda en llegar un nuevo pedido de
    #   este material (tiempo_reposicion_dias, configurable por material,
    #   porque no todos los materiales tardan lo mismo en reponerse).
    # - Z_SERVICIO: margen extra por lo variable que es la demanda mes a mes
    #   (1.65 = nivel de servicio ~95%, o sea ~5% de probabilidad de
    #   quedarse sin stock durante el tiempo de reposicion).
    # - Stock maximo = Stock minimo + Lote de compra (lote_compra,
    #   configurable por material): la cantidad que normalmente se compra
    #   en cada pedido (depende del proveedor, descuentos por volumen,
    #   empaque, capacidad de almacenaje o cantidad economica de compra).
    #
    # A mas historial (mas meses con movimientos), mas confiable es el
    # promedio y la desviacion estandar, y por lo tanto la sugerencia.
    # ---------------------------------------------------------------------
    DIAS_POR_MES = 30
    Z_SERVICIO = 1.65

    tiempo_reposicion = material.tiempo_reposicion_dias or 15
    lote_compra = material.lote_compra or 100
    demanda_diaria_promedio = consumo_promedio_mensual / DIAS_POR_MES
    desviacion_estandar_diaria = desviacion_estandar_mensual / (DIAS_POR_MES**0.5)

    stock_seguridad = Z_SERVICIO * desviacion_estandar_diaria * (tiempo_reposicion**0.5)
    stock_minimo_sugerido = round(demanda_diaria_promedio * tiempo_reposicion + stock_seguridad)
    stock_maximo_sugerido = stock_minimo_sugerido + lote_compra

    return jsonify(
        {
            "meses_con_datos": meses_con_datos,
            "suficiente": meses_con_datos >= 2,
            "consumo_promedio_mensual": round(consumo_promedio_mensual, 2),
            "desviacion_estandar_mensual": round(desviacion_estandar_mensual, 2),
            "demanda_diaria_promedio": round(demanda_diaria_promedio, 2),
            "tiempo_reposicion_dias": tiempo_reposicion,
            "lote_compra": lote_compra,
            "stock_seguridad": round(stock_seguridad, 2),
            "stock_minimo_sugerido": stock_minimo_sugerido,
            "stock_maximo_sugerido": stock_maximo_sugerido,
        }
    )
