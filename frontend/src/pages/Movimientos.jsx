import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import MotionRow from "../components/MotionRow";
import { api } from "../api/client";
import { money } from "../utils/format";

const emptyFiltros = { obra_id: "", material_id: "", tipo: "", desde: "", hasta: "" };

export default function Movimientos() {
  const [obras, setObras] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros] = useState(emptyFiltros);

  useEffect(() => {
    api.get("/obras").then(setObras).catch(() => {});
    api.get("/materiales").then(setMateriales).catch(() => {});
  }, []);

  const buscar = (f) => {
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    api.get(`/movimientos?${params.toString()}`).then(setMovimientos).catch(() => {});
  };

  useEffect(() => { buscar(emptyFiltros); }, []);

  const onChange = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  const onSubmit = (e) => { e.preventDefault(); buscar(filtros); };
  const limpiar = () => { setFiltros(emptyFiltros); buscar(emptyFiltros); };

  return (
    <Layout
      title="Historial de movimientos"
      subtitle="Consulta y filtra entradas y salidas"
      actions={<Link to="/movimientos/nuevo" className="btn btn-primary">➕ Registrar movimiento</Link>}
    >
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={onSubmit} className="filters">
          <div className="field">
            <label>Obra</label>
            <select name="obra_id" value={filtros.obra_id} onChange={onChange}>
              <option value="">Todas</option>
              {obras.map((o) => <option key={o.obra_id} value={o.obra_id}>{o.nombre_obra}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Material</label>
            <select name="material_id" value={filtros.material_id} onChange={onChange}>
              <option value="">Todos</option>
              {materiales.map((m) => <option key={m.material_id} value={m.material_id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select name="tipo" value={filtros.tipo} onChange={onChange}>
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
            </select>
          </div>
          <div className="field">
            <label>Desde</label>
            <input type="date" name="desde" value={filtros.desde} onChange={onChange} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input type="date" name="hasta" value={filtros.hasta} onChange={onChange} />
          </div>
          <div className="field">
            <button type="submit" className="btn btn-primary">Filtrar</button>
          </div>
          <div className="field">
            <button type="button" className="btn btn-ghost" onClick={limpiar}>Limpiar</button>
          </div>
        </form>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {movimientos.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Tipo</th><th>Material</th><th>Obra</th>
                  <th>Cantidad</th><th>Costo unitario</th><th>Costo total</th><th>Lote</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <MotionRow key={m.movimiento_id} index={i}>
                    <td>{new Date(m.fecha + "T00:00:00").toLocaleDateString("es-CO")}</td>
                    <td>
                      {m.tipo_movimiento === "ENTRADA" ? (
                        <span className="badge badge-entrada">⬇ Entrada</span>
                      ) : (
                        <span className="badge badge-salida">⬆ Salida</span>
                      )}
                    </td>
                    <td>{m.material.nombre}</td>
                    <td>{m.obra.nombre_obra}</td>
                    <td>{m.cantidad.toFixed(2)} {m.material.unidad}</td>
                    <td>{money(m.costo_unitario)}</td>
                    <td><strong>{money(m.costo_total)}</strong></td>
                    <td>{m.lote || "—"}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><div className="ic">🔍</div>No se encontraron movimientos con esos filtros.</div>
        )}
      </motion.div>
    </Layout>
  );
}
