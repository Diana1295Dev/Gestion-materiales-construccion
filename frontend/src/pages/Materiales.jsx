import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import MotionRow from "../components/MotionRow";
import { api } from "../api/client";

const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [message, setMessage] = useState(null);

  const load = () => api.get("/materiales").then(setMateriales).catch((e) => setMessage({ type: "error", text: e.message }));

  useEffect(() => { load(); }, []);

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
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {materiales.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th><th>Categoría</th><th>Costo unitario</th>
                  <th>Stock actual</th><th>Mín. / Máx.</th><th></th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((m, i) => (
                  <MotionRow key={m.material_id} index={i}>
                    <td>
                      <strong>{m.nombre}</strong>
                      <br />
                      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{m.descripcion}</span>
                    </td>
                    <td><span className="badge badge-cat">{m.categoria}</span></td>
                    <td>{money(m.costo_unitario)} / {m.unidad}</td>
                    <td>
                      <span className={`badge ${m.stock_actual <= m.stock_minimo ? "badge-stock-bajo" : "badge-stock-ok"}`}>
                        {m.stock_actual.toFixed(2)} {m.unidad}
                      </span>
                    </td>
                    <td>{m.stock_minimo} / {m.stock_maximo}</td>
                    <td className="row-actions">
                      <Link to={`/materiales/${m.material_id}/editar`} className="btn btn-ghost btn-sm">✏️ Editar</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(m)}>🗑️</button>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="ic">🧱</div>
            No hay materiales registrados todavía.
            <br />
            <Link to="/materiales/nuevo" className="btn btn-primary" style={{ marginTop: 16 }}>Registrar el primer material</Link>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
