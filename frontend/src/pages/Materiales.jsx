import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import MotionRow from "../components/MotionRow";
import ProgressStock from "../components/ProgressStock";
import { api } from "../api/client";
import { money } from "../utils/format";

export default function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [message, setMessage] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");

  const load = () => api.get("/materiales").then(setMateriales).catch((e) => setMessage({ type: "error", text: e.message }));

  useEffect(() => { load(); }, []);

  const categorias = useMemo(
    () => [...new Set(materiales.map((m) => m.categoria))].sort((a, b) => a.localeCompare(b)),
    [materiales]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return materiales.filter((m) => {
      const matchTexto = !q || m.nombre.toLowerCase().includes(q) || (m.descripcion || "").toLowerCase().includes(q);
      const matchCategoria = !categoria || m.categoria === categoria;
      return matchTexto && matchCategoria;
    });
  }, [materiales, busqueda, categoria]);

  const hayFiltrosActivos = Boolean(busqueda || categoria);
  const limpiarFiltros = () => { setBusqueda(""); setCategoria(""); };

  const eliminar = async (m) => {
    if (!confirm(`¿Eliminar el material '${m.nombre}'?`)) return;
    try {
      await api.del(`/materiales/${m.material_id}`);
      setMessage({ type: "success", text: `Material '${m.nombre}' eliminado.` });
      load();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  return (
    <Layout
      title="Materiales"
      subtitle="Catálogo e inventario actual"
      actions={<Link to="/materiales/nuevo" className="btn btn-primary">➕ Nuevo material</Link>}
    >
      <Flash message={message} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filters">
          <div className="field">
            <label>Buscar</label>
            <input
              type="text"
              placeholder="Nombre o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {hayFiltrosActivos && (
            <div className="field">
              <button type="button" className="btn btn-ghost" onClick={limpiarFiltros}>Limpiar filtros</button>
            </div>
          )}
        </div>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {materiales.length === 0 ? (
          <div className="empty-state">
            <div className="ic">🧱</div>
            No hay materiales registrados todavía.
            <br />
            <Link to="/materiales/nuevo" className="btn btn-primary" style={{ marginTop: 16 }}>Registrar el primer material</Link>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            <div className="ic">🔍</div>
            Ningún material coincide con la búsqueda o el filtro seleccionado.
            <br />
            <button type="button" className="btn btn-ghost" style={{ marginTop: 16 }} onClick={limpiarFiltros}>Limpiar filtros</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th><th>Categoría</th><th>Costo unitario</th>
                  <th>Stock</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, i) => (
                  <MotionRow key={m.material_id} index={i}>
                    <td>
                      <strong>{m.nombre}</strong>
                      <br />
                      <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>{m.descripcion}</span>
                    </td>
                    <td><span className="badge badge-cat">{m.categoria}</span></td>
                    <td>{money(m.costo_unitario)} / {m.unidad}</td>
                    <td>
                      <ProgressStock
                        value={m.stock_actual}
                        min={m.stock_minimo}
                        max={m.stock_maximo}
                        unit={m.unidad}
                      />
                    </td>
                    <td className="row-actions">
                      <Link to={`/materiales/${m.material_id}/editar`} className="btn btn-ghost btn-sm">✏️ Editar</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(m)}>🗑️</button>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
