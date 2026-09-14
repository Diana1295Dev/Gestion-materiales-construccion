from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for

from extensions import db
from models import Obra

bp = Blueprint("obras", __name__, url_prefix="/obras")

ESTADOS = ["activa", "completada", "suspendida"]


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date() if value else None


@bp.route("/")
def index():
    obras = Obra.query.order_by(Obra.fecha_creacion.desc()).all()
    return render_template("obras/list.html", active_page="obras", obras=obras)


@bp.route("/nueva", methods=["GET", "POST"])
def nueva():
    if request.method == "POST":
        try:
            obra = Obra(
                nombre_obra=request.form["nombre_obra"].strip(),
                ubicacion=request.form["ubicacion"].strip(),
                ciudad=request.form["ciudad"].strip(),
                presupuesto_total=request.form["presupuesto_total"],
                estado=request.form["estado"],
                fecha_inicio=_parse_date(request.form["fecha_inicio"]),
                fecha_cierre=_parse_date(request.form.get("fecha_cierre")),
                responsable=request.form.get("responsable", "").strip(),
            )
            db.session.add(obra)
            db.session.commit()
            flash(f"Obra '{obra.nombre_obra}' creada correctamente.", "success")
            return redirect(url_for("obras.index"))
        except Exception as exc:
            db.session.rollback()
            flash(f"No se pudo guardar la obra: {exc}", "error")

    return render_template(
        "obras/form.html", active_page="obras", obra=None, estados=ESTADOS
    )


@bp.route("/<int:obra_id>/editar", methods=["GET", "POST"])
def editar(obra_id):
    obra = Obra.query.get_or_404(obra_id)

    if request.method == "POST":
        try:
            obra.nombre_obra = request.form["nombre_obra"].strip()
            obra.ubicacion = request.form["ubicacion"].strip()
            obra.ciudad = request.form["ciudad"].strip()
            obra.presupuesto_total = request.form["presupuesto_total"]
            obra.estado = request.form["estado"]
            obra.fecha_inicio = _parse_date(request.form["fecha_inicio"])
            obra.fecha_cierre = _parse_date(request.form.get("fecha_cierre"))
            obra.responsable = request.form.get("responsable", "").strip()
            db.session.commit()
            flash(f"Obra '{obra.nombre_obra}' actualizada.", "success")
            return redirect(url_for("obras.index"))
        except Exception as exc:
            db.session.rollback()
            flash(f"No se pudo actualizar la obra: {exc}", "error")

    return render_template(
        "obras/form.html", active_page="obras", obra=obra, estados=ESTADOS
    )


@bp.route("/<int:obra_id>/eliminar", methods=["POST"])
def eliminar(obra_id):
    obra = Obra.query.get_or_404(obra_id)
    if obra.movimientos:
        flash(
            f"No se puede eliminar '{obra.nombre_obra}': tiene movimientos registrados.",
            "error",
        )
        return redirect(url_for("obras.index"))

    db.session.delete(obra)
    db.session.commit()
    flash(f"Obra '{obra.nombre_obra}' eliminada.", "success")
    return redirect(url_for("obras.index"))
