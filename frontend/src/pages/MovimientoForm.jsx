import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import { api } from "../api/client";

const today = new Date().toISOString().slice(0, 10);

const empty = {
  tipo_movimiento: "ENTRADA",
  obra_id: "",
  material_id: "",
  cantidad: "",
  costo_unitario: "",
  fecha: today,
  lote: "",
  observaciones: "",
};

export default function MovimientoForm() {
  const navigate = useNavigate();
  const [obras, setObras] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/obras?estado=activa").then(setObras).catch(() => {});
    api.get("/materiales").then(setMateriales).catch(() => {});
  }, []);

  const materialSeleccionado = useMemo(
    () => materiales.find((m) => String(m.material_id) === String(form.material_id)),
    [materiales, form.material_id]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "material_id") {
        const mat = materiales.find((m) => String(m.material_id) === String(value));
        if (mat) next.costo_unitario = mat.costo_unitario;
      }
      return next;
    });
  };

  const costoTotal = (parseFloat(form.cantidad) || 0) * (parseFloat(form.costo_unitario) || 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const mov = await api.post("/movimientos", form);
      setMessage({
        type: "success",
        text: `Movimiento de ${mov.tipo_movimiento.toLowerCase()} registrado correctamente.`,
      });
      setForm({ ...empty, obra_id: form.obra_id });
    } catch (err) {
      setMessage({ type: "error", text: `No se pudo registrar el movimiento: ${err.message}` });
    }
  };

  if (!obras.length) {
    return (
      <Layout title="Registrar movimiento" subtitle="Entrada o salida de materiales en obra">
        <div className="card" style={{ maxWidth: 820 }}>
          <div className="empty-state">
            <div className="ic">🏢</div>
            Necesitas al menos una obra <strong>activa</strong> para registrar movimientos.
            <br />
            <Link to="/obras/nueva" className="btn btn-primary" style={{ marginTop: 16 }}>Crear obra</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!materiales.length) {
    return (
      <Layout title="Registrar movimiento" subtitle="Entrada o salida de materiales en obra">
        <div className="card" style={{ maxWidth: 820 }}>
          <div className="empty-state">
            <div className="ic">🧱</div>
            Necesitas al menos un material en el catálogo.
            <br />
            <Link to="/materiales/nuevo" className="btn btn-primary" style={{ marginTop: 16 }}>Crear material</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Registrar movimiento" subtitle="Entrada o salida de materiales en obra">
      <Flash message={message} />
      <motion.div className="card" style={{ maxWidth: 820 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <form onSubmit={onSubmit}>
          <div className="field full" style={{ marginBottom: 20 }}>
            <label>Tipo de movimiento</label>
            <div className="toggle-tipo">
              <input
                type="radio"
                id="tipo-entrada"
                name="tipo_movimiento"
                value="ENTRADA"
                checked={form.tipo_movimiento === "ENTRADA"}
                onChange={onChange}
              />
              <label htmlFor="tipo-entrada" className="entrada">⬇ Entrada de material</label>
              <input
                type="radio"
                id="tipo-salida"
                name="tipo_movimiento"
                value="SALIDA"
                checked={form.tipo_movimiento === "SALIDA"}
                onChange={onChange}
              />
              <label htmlFor="tipo-salida" className="salida">⬆ Salida de material</label>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Obra</label>
              <select name="obra_id" required value={form.obra_id} onChange={onChange}>
                <option value="" disabled>Selecciona una obra</option>
                {obras.map((o) => (
                  <option key={o.obra_id} value={o.obra_id}>{o.nombre_obra} — {o.ciudad}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Material</label>
              <select name="material_id" required value={form.material_id} onChange={onChange}>
                <option value="" disabled>Selecciona un material</option>
                {materiales.map((m) => (
                  <option key={m.material_id} value={m.material_id}>{m.nombre} ({m.unidad})</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Cantidad {materialSeleccionado && <span className="hint">({materialSeleccionado.unidad})</span>}</label>
              <input type="number" step="0.01" min="0.01" name="cantidad" required value={form.cantidad} onChange={onChange} />
            </div>

            <div className="field">
              <label>Costo unitario (COP)</label>
              <input type="number" step="0.01" min="0" name="costo_unitario" required value={form.costo_unitario} onChange={onChange} />
            </div>

            <div className="field">
              <label>Fecha</label>
              <input type="date" name="fecha" required value={form.fecha} onChange={onChange} />
            </div>

            <div className="field">
              <label>Lote <span className="hint">(opcional)</span></label>
              <input name="lote" maxLength={50} value={form.lote} onChange={onChange} placeholder="Ej. LOTE-2026-014" />
            </div>

            <div className="field full">
              <label>Observaciones <span className="hint">(opcional)</span></label>
              <textarea name="observaciones" maxLength={255} value={form.observaciones} onChange={onChange} placeholder="Detalles adicionales del movimiento"></textarea>
            </div>

            <div className="field full">
              <label>Costo total estimado</label>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={costoTotal.toFixed(2)}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontFamily: "var(--font-sans)", fontSize: 26, fontWeight: 700, color: "var(--color-primary)" }}
                >
                  ${costoTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-ghost">Cancelar</Link>
            <button type="submit" className="btn btn-primary">Registrar movimiento</button>
          </div>
        </form>
      </motion.div>
    </Layout>
  );
}
