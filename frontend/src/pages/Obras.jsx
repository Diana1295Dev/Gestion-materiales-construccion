import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import MotionRow from "../components/MotionRow";
import ProgressStock from "../components/ProgressStock";
import { api } from "../api/client";

const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyCompact = (n) =>
  "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [message, setMessage] = useState(null);

  const load = () => api.get("/obras").then(setObras).catch((e) => setMessage({ type: "error", text: e.message }));

  useEffect(() => { load(); }, []);

  const eliminar = async (obra) => {
    if (!confirm(`¿Eliminar la obra '${obra.nombre_obra}'?`)) return;
    try {
      await api.del(`/obras/${obra.obra_id}`);
      setMessage({ type: "success", text: `Obra '${obra.nombre_obra}' eliminada.` });
      load();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  return (
    <Layout
      title="Obras"
      subtitle="Proyectos de construcción registrados"
      actions={<Link to="/obras/nueva" className="btn btn-primary">➕ Nueva obra</Link>}
    >
      <Flash message={message} />
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {obras.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Obra</th><th>Ciudad</th><th>Responsable</th><th>Gasto vs. presupuesto</th>
                  <th>Estado</th><th>Inicio</th><th></th>
                </tr>
              </thead>
              <tbody>
                {obras.map((obra, i) => (
                  <MotionRow key={obra.obra_id} index={i}>
                    <td>
                      <strong>{obra.nombre_obra}</strong>
                      <br />
                      <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>{obra.ubicacion}</span>
                    </td>
                    <td>{obra.ciudad}</td>
                    <td>{obra.responsable || "—"}</td>
                    <td>
                      <ProgressStock
                        variant="budget"
                        value={obra.gasto_acumulado ?? 0}
                        max={obra.presupuesto_total}
                        format={moneyCompact}
                      />
                    </td>
                    <td><span className={`badge badge-${obra.estado}`}>{obra.estado[0].toUpperCase() + obra.estado.slice(1)}</span></td>
                    <td>{new Date(obra.fecha_inicio + "T00:00:00").toLocaleDateString("es-CO")}</td>
                    <td className="row-actions">
                      <Link to={`/obras/${obra.obra_id}/editar`} className="btn btn-ghost btn-sm">✏️ Editar</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(obra)}>🗑️</button>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="ic">🏗️</div>
            No hay obras registradas todavía.
            <br />
            <Link to="/obras/nueva" className="btn btn-primary" style={{ marginTop: 16 }}>Registrar la primera obra</Link>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
