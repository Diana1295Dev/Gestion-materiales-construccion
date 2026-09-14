from flask import Blueprint, render_template
from sqlalchemy import case, func

from extensions import db
from models import Material, Movimiento, Obra, stock_por_material_subquery

bp = Blueprint("dashboard", __name__, url_prefix="/")


@bp.route("/")
def index():
    total_obras_activas = Obra.query.filter_by(estado="activa").count()
    total_materiales = Material.query.count()
    total_movimientos = Movimiento.query.count()

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

    stock_subq = stock_por_material_subquery()

    stock_rows = (
        db.session.query(Material, func.coalesce(stock_subq.c.stock_actual, 0))
        .outerjoin(stock_subq, stock_subq.c.material_id == Material.material_id)
        .all()
    )

    inventario = []
    alertas = []
    for material, stock_actual in stock_rows:
        stock_actual = float(stock_actual or 0)
        item = {"material": material, "stock_actual": stock_actual}
        inventario.append(item)
        if stock_actual <= float(material.stock_minimo or 0):
            alertas.append(item)

    inventario.sort(key=lambda x: x["material"].nombre)
    alertas.sort(key=lambda x: x["stock_actual"])

    recientes = (
        Movimiento.query.order_by(Movimiento.fecha_registro.desc()).limit(8).all()
    )

    return render_template(
        "dashboard.html",
        active_page="dashboard",
        total_obras_activas=total_obras_activas,
        total_materiales=total_materiales,
        total_movimientos=total_movimientos,
        valor_inventario=valor_inventario,
        inventario=inventario,
        alertas=alertas,
        recientes=recientes,
    )
