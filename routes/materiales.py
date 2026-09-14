from flask import Blueprint, flash, redirect, render_template, request, url_for
from sqlalchemy import func

from extensions import db
from models import Material, stock_por_material_subquery

bp = Blueprint("materiales", __name__, url_prefix="/materiales")

UNIDADES = ["kg", "m3", "m2", "unidad", "bolsa", "litro", "varilla", "rollo"]
CATEGORIAS = ["Estructural", "Acabados", "Fundacion", "Instalaciones", "Herramientas"]


@bp.route("/")
def index():
    stock_subq = stock_por_material_subquery()

    rows = (
        db.session.query(Material, func.coalesce(stock_subq.c.stock_actual, 0))
        .outerjoin(stock_subq, stock_subq.c.material_id == Material.material_id)
        .order_by(Material.nombre)
        .all()
    )

    materiales = [
        {"material": material, "stock_actual": float(stock or 0)} for material, stock in rows
    ]

    return render_template(
        "materiales/list.html", active_page="materiales", materiales=materiales
    )


@bp.route("/nuevo", methods=["GET", "POST"])
def nuevo():
    if request.method == "POST":
        try:
            material = Material(
                nombre=request.form["nombre"].strip(),
                unidad=request.form["unidad"],
                costo_unitario=request.form["costo_unitario"],
                categoria=request.form["categoria"],
                stock_minimo=request.form.get("stock_minimo") or 0,
                stock_maximo=request.form.get("stock_maximo") or 1000,
                descripcion=request.form.get("descripcion", "").strip(),
            )
            db.session.add(material)
            db.session.commit()
            flash(f"Material '{material.nombre}' creado correctamente.", "success")
            return redirect(url_for("materiales.index"))
        except Exception as exc:
            db.session.rollback()
            flash(f"No se pudo guardar el material: {exc}", "error")

    return render_template(
        "materiales/form.html",
        active_page="materiales",
        material=None,
        unidades=UNIDADES,
        categorias=CATEGORIAS,
    )


@bp.route("/<int:material_id>/editar", methods=["GET", "POST"])
def editar(material_id):
    material = Material.query.get_or_404(material_id)

    if request.method == "POST":
        try:
            material.nombre = request.form["nombre"].strip()
            material.unidad = request.form["unidad"]
            material.costo_unitario = request.form["costo_unitario"]
            material.categoria = request.form["categoria"]
            material.stock_minimo = request.form.get("stock_minimo") or 0
            material.stock_maximo = request.form.get("stock_maximo") or 1000
            material.descripcion = request.form.get("descripcion", "").strip()
            db.session.commit()
            flash(f"Material '{material.nombre}' actualizado.", "success")
            return redirect(url_for("materiales.index"))
        except Exception as exc:
            db.session.rollback()
            flash(f"No se pudo actualizar el material: {exc}", "error")

    return render_template(
        "materiales/form.html",
        active_page="materiales",
        material=material,
        unidades=UNIDADES,
        categorias=CATEGORIAS,
    )


@bp.route("/<int:material_id>/eliminar", methods=["POST"])
def eliminar(material_id):
    material = Material.query.get_or_404(material_id)
    if material.movimientos:
        flash(
            f"No se puede eliminar '{material.nombre}': tiene movimientos registrados.",
            "error",
        )
        return redirect(url_for("materiales.index"))

    db.session.delete(material)
    db.session.commit()
    flash(f"Material '{material.nombre}' eliminado.", "success")
    return redirect(url_for("materiales.index"))
