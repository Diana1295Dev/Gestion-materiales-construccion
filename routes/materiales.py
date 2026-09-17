import statistics

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from models import Material, Movimiento, Tiempo, stock_por_material_subquery

bp = Blueprint("materiales", __name__, url_prefix="/api/materiales")

UNIDADES = ["kg", "m3", "m2", "unidad", "bolsa", "litro", "varilla", "rollo"]
CATEGORIAS = ["Estructural", "Acabados", "Fundacion", "Instalaciones", "Herramientas"]

MATERIALES_INICIALES = [
    {"nombre": "Cemento gris tipo I", "categoria": "Estructural", "unidad": "kg", "costo_unitario": 450},
    {"nombre": "Acero de refuerzo", "categoria": "Estructural", "unidad": "kg", "costo_unitario": 3500},
    {"nombre": "Ladrillo estructural", "categoria": "Estructural", "unidad": "unidad", "costo_unitario": 1200},
    {"nombre": "Arena gruesa", "categoria": "Fundacion", "unidad": "m3", "costo_unitario": 80000},
    {"nombre": "Grava", "categoria": "Fundacion", "unidad": "m3", "costo_unitario": 120000},
    {"nombre": "Bloque de concreto", "categoria": "Estructural", "unidad": "unidad", "costo_unitario": 2500},
    {"nombre": "Varilla de acero", "categoria": "Estructural", "unidad": "varilla", "costo_unitario": 28000},
    {"nombre": "Tuberías PVC", "categoria": "Instalaciones", "unidad": "unidad", "costo_unitario": 15000},
    {"nombre": "Pintura latex", "categoria": "Acabados", "unidad": "litro", "costo_unitario": 35000},
    {"nombre": "Madera aserrada", "categoria": "Acabados", "unidad": "m3", "costo_unitario": 2500000},
    {"nombre": "Tabique rojo", "categoria": "Estructural", "unidad": "unidad", "costo_unitario": 800},
    {"nombre": "Yeso", "categoria": "Acabados", "unidad": "bolsa", "costo_unitario": 12000},
    {"nombre": "Vidrio templado", "categoria": "Acabados", "unidad": "m2", "costo_unitario": 450000},
    {"nombre": "Cerámicas", "categoria": "Acabados", "unidad": "m2", "costo_unitario": 250000},
    {"nombre": "Tejas de barro", "categoria": "Acabados", "unidad": "unidad", "costo_unitario": 5000},
]

# ---------------------------------------------------------------------------
# Formula de punto de reorden (inventario clasico, no ML):
#
#   Stock minimo = (Demanda diaria promedio x Tiempo de reposicion)
#                  + Stock de seguridad
#
#   Stock de seguridad = Z_SERVICIO x Desviacion estandar diaria
#                        x sqrt(Tiempo de reposicion)
#
#   Stock maximo = Stock minimo + Lote de compra
#
# - Demanda diaria promedio / Desviacion estandar diaria: se derivan del
#   consumo mensual observado (salidas reales), asumiendo DIAS_POR_MES dias
#   por mes.
# - Tiempo de reposicion: dias que tarda en llegar un nuevo pedido de este
#   material (tiempo_reposicion_dias, configurable por material).
# - Z_SERVICIO: margen extra por lo variable que es la demanda mes a mes
#   (1.65 = nivel de servicio ~95%).
# - Lote de compra (lote_compra): cantidad que normalmente se compra en
#   cada pedido (depende del proveedor, empaque, descuentos por volumen,
#   capacidad de almacenaje o cantidad economica de compra).
#
# Por esto stock_minimo/stock_maximo NO son campos editables a mano: se
# recalculan siempre que se crea/edita el material o se registra una salida.
# ---------------------------------------------------------------------------
DIAS_POR_MES = 30
Z_SERVICIO = 1.65


def _material_from_payload(payload, material=None):
    material = material or Material()
    material.nombre = payload["nombre"].strip()
    material.unidad = payload["unidad"]
    material.costo_unitario = payload["costo_unitario"]
    material.categoria = payload["categoria"]
    material.tiempo_reposicion_dias = payload.get("tiempo_reposicion_dias") or 15
    material.lote_compra = payload.get("lote_compra") or 100
    material.descripcion = (payload.get("descripcion") or "").strip()
    return material


def _calcular_sugerencia(material):
    """Calcula la sugerencia de stock minimo/maximo para un material segun
    su historial real de salidas. Ver formula documentada arriba.
    """
    lote_compra = material.lote_compra or 100
    tiempo_reposicion = material.tiempo_reposicion_dias or 15

    filas = (
        db.session.query(Tiempo.anio, Tiempo.mes, func.sum(Movimiento.cantidad).label("total"))
        .join(Tiempo, Tiempo.fecha_id == Movimiento.fecha_id)
        .filter(Movimiento.material_id == material.material_id, Movimiento.tipo_movimiento == "SALIDA")
        .group_by(Tiempo.anio, Tiempo.mes)
        .all()
    )
    totales_mensuales = [float(f.total) for f in filas]
    meses_con_datos = len(totales_mensuales)

    if meses_con_datos == 0:
        return {
            "meses_con_datos": 0,
            "suficiente": False,
            "tiempo_reposicion_dias": tiempo_reposicion,
            "lote_compra": lote_compra,
            "stock_minimo_sugerido": 0,
            "stock_maximo_sugerido": lote_compra,
            "mensaje": "Aun no hay salidas registradas de este material; el minimo/maximo "
            "se calculara automaticamente cuando registres movimientos.",
        }

    consumo_promedio_mensual = statistics.mean(totales_mensuales)
    desviacion_estandar_mensual = statistics.stdev(totales_mensuales) if meses_con_datos >= 2 else 0.0

    demanda_diaria_promedio = consumo_promedio_mensual / DIAS_POR_MES
    desviacion_estandar_diaria = desviacion_estandar_mensual / (DIAS_POR_MES**0.5)

    stock_seguridad = Z_SERVICIO * desviacion_estandar_diaria * (tiempo_reposicion**0.5)
    stock_minimo_sugerido = round(demanda_diaria_promedio * tiempo_reposicion + stock_seguridad)
    stock_maximo_sugerido = stock_minimo_sugerido + lote_compra

    return {
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


def aplicar_stock_calculado(material):
    """Recalcula y guarda (en el objeto, sin commit) stock_minimo/stock_maximo
    del material segun su historial actual. Se llama al crear/editar un
    material y al registrar una salida de ese material.
    """
    sugerencia = _calcular_sugerencia(material)
    material.stock_minimo = sugerencia["stock_minimo_sugerido"]
    material.stock_maximo = sugerencia["stock_maximo_sugerido"]


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
        db.session.flush()
        aplicar_stock_calculado(material)
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
        aplicar_stock_calculado(material)
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
    material = Material.query.get_or_404(material_id)
    return jsonify(_calcular_sugerencia(material))


@bp.route("/init/cargar-iniciales", methods=["POST"])
def cargar_materiales_iniciales():
    from flask import request
    if request.args.get("key") != __import__("config").Config.SECRET_KEY:
        return jsonify({"error": "No autorizado"}), 403

    creados = 0
    for mat_data in MATERIALES_INICIALES:
        existe = Material.query.filter_by(nombre=mat_data["nombre"]).first()
        if not existe:
            material = Material(
                nombre=mat_data["nombre"],
                categoria=mat_data["categoria"],
                unidad=mat_data["unidad"],
                costo_unitario=mat_data["costo_unitario"],
                stock_minimo=0,
                stock_maximo=1000,
                descripcion=""
            )
            db.session.add(material)
            creados += 1

    db.session.commit()
    return jsonify({"status": "ok", "creados": creados, "total": len(MATERIALES_INICIALES)})
