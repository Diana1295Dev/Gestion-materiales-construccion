from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import case, func

from extensions import db
from models import Material, Movimiento, Obra, Tiempo, stock_por_material_subquery

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.route("", methods=["GET"])
def index():
    from sqlalchemy import text

    total_obras_activas = Obra.query.filter_by(estado="activa").count()
    total_movimientos = Movimiento.query.count()

    try:
        total_materiales = Material.query.count()
    except Exception:
        total_materiales = db.session.query(db.func.count(Material.material_id)).scalar() or 0

    valor_inventario = (
        db.session.query(
            func.coalesce(
                func.sum(
                    case(
                        (Movimiento.tipo_movimiento == "ENTRADA", Movimiento.costo_total),
                        else_=-Movimiento.costo_total,
                    )
                ),
                0,
            )
        ).scalar()
        or 0
    )

    inventario = []
    alertas = []

    try:
        stock_subq = stock_por_material_subquery()
        stock_rows = (
            db.session.query(Material, func.coalesce(stock_subq.c.stock_actual, 0))
            .outerjoin(stock_subq, stock_subq.c.material_id == Material.material_id)
            .all()
        )

        for material, stock_actual in stock_rows:
            stock_actual = float(stock_actual or 0)
            item = material.to_dict(stock_actual=stock_actual)
            inventario.append(item)
            if stock_actual <= float(material.stock_minimo or 0):
                alertas.append(item)

        inventario.sort(key=lambda x: x["nombre"])
        alertas.sort(key=lambda x: x["stock_actual"])
    except Exception:
        pass

    recientes = (
        Movimiento.query.order_by(Movimiento.fecha_registro.desc()).limit(8).all()
    )

    return jsonify(
        {
            "totales": {
                "obras_activas": total_obras_activas,
                "materiales": total_materiales,
                "movimientos": total_movimientos,
                "valor_inventario": float(valor_inventario),
            },
            "inventario": inventario,
            "alertas": alertas,
            "recientes": [m.to_dict() for m in recientes],
        }
    )


def _primer_dia_mes(d):
    return d.replace(day=1)


def _mes_anterior(primer_dia):
    ultimo_dia_mes_previo = primer_dia - timedelta(days=1)
    return ultimo_dia_mes_previo.replace(day=1)


def _delta_pct(actual, anterior):
    if not anterior:
        return None
    return round((actual - anterior) / anterior * 100, 2)


@bp.route("/series", methods=["GET"])
def series():
    meses_ventana = request.args.get("meses", default=12, type=int)

    filas = (
        db.session.query(
            Tiempo.anio,
            Tiempo.mes,
            Tiempo.nombre_mes,
            func.coalesce(
                func.sum(case((Movimiento.tipo_movimiento == "ENTRADA", Movimiento.costo_total), else_=0)),
                0,
            ).label("entradas"),
            func.coalesce(
                func.sum(case((Movimiento.tipo_movimiento == "SALIDA", Movimiento.costo_total), else_=0)),
                0,
            ).label("salidas"),
            func.count(Movimiento.movimiento_id).label("movimientos"),
        )
        .join(Movimiento, Movimiento.fecha_id == Tiempo.fecha_id)
        .group_by(Tiempo.anio, Tiempo.mes, Tiempo.nombre_mes)
        .order_by(Tiempo.anio, Tiempo.mes)
        .all()
    )

    todos_los_meses = []
    acumulado = 0.0
    for anio, mes, nombre_mes, entradas, salidas, movimientos in filas:
        entradas = float(entradas)
        salidas = float(salidas)
        acumulado += entradas - salidas
        todos_los_meses.append(
            {
                "periodo": f"{anio}-{mes:02d}",
                "anio": anio,
                "mes": mes,
                "nombre_mes": nombre_mes,
                "entradas": entradas,
                "salidas": salidas,
                "movimientos": movimientos,
                "valor_inventario_acumulado": acumulado,
            }
        )

    meses_serie = todos_los_meses[-meses_ventana:] if meses_ventana > 0 else todos_los_meses

    mes_actual = todos_los_meses[-1] if todos_los_meses else None
    mes_anterior = todos_los_meses[-2] if len(todos_los_meses) > 1 else None

    variacion_movimientos = {
        "actual": mes_actual["movimientos"] if mes_actual else 0,
        "anterior": mes_anterior["movimientos"] if mes_anterior else 0,
    }
    variacion_movimientos["delta_pct"] = _delta_pct(
        variacion_movimientos["actual"], variacion_movimientos["anterior"]
    )

    variacion_valor = {
        "actual": mes_actual["valor_inventario_acumulado"] if mes_actual else 0.0,
        "anterior": mes_anterior["valor_inventario_acumulado"] if mes_anterior else 0.0,
    }
    variacion_valor["delta_pct"] = _delta_pct(variacion_valor["actual"], variacion_valor["anterior"])

    hoy = date.today()
    primer_dia_actual = _primer_dia_mes(hoy)
    primer_dia_anterior = _mes_anterior(primer_dia_actual)

    primer_dia_actual_dt = datetime.combine(primer_dia_actual, datetime.min.time())
    primer_dia_anterior_dt = datetime.combine(primer_dia_anterior, datetime.min.time())

    try:
        materiales_actual = Material.query.filter(Material.fecha_creacion >= primer_dia_actual_dt).count()
        materiales_anterior = Material.query.filter(
            Material.fecha_creacion >= primer_dia_anterior_dt, Material.fecha_creacion < primer_dia_actual_dt
        ).count()
    except Exception:
        materiales_actual = 0
        materiales_anterior = 0

    try:
        obras_actual = Obra.query.filter(Obra.fecha_creacion >= primer_dia_actual_dt).count()
        obras_anterior = Obra.query.filter(
            Obra.fecha_creacion >= primer_dia_anterior_dt, Obra.fecha_creacion < primer_dia_actual_dt
        ).count()
    except Exception:
        obras_actual = 0
        obras_anterior = 0

    return jsonify(
        {
            "meses": meses_serie,
            "variacion": {
                "movimientos": variacion_movimientos,
                "valor_inventario": variacion_valor,
                "materiales_nuevos": {
                    "actual": materiales_actual,
                    "anterior": materiales_anterior,
                    "delta_pct": _delta_pct(materiales_actual, materiales_anterior),
                },
                "obras_nuevas": {
                    "actual": obras_actual,
                    "anterior": obras_anterior,
                    "delta_pct": _delta_pct(obras_actual, obras_anterior),
                },
            },
        }
    )
