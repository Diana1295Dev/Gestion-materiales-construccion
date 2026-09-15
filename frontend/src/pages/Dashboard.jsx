import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import AnimatedNumber from "../components/AnimatedNumber";
import { api } from "../api/client";

const money = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Layout
      title="Panel general"
      subtitle="Resumen del inventario y actividad reciente"
      actions={
        <Link to="/movimientos/nuevo" className="btn btn-primary">
          ➕ Registrar movimiento
        </Link>
      }
    >
      {error && <div className="flashes"><div className="flash error">{error}</div></div>}
      {!data ? (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 122, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            {[
              { cls: "c-lavender", icon: "🏢", value: data.totales.obras_activas, label: "Obras en marcha" },
              { cls: "c-mint", icon: "🧱", value: data.totales.materiales, label: "Materiales registrados" },
              { cls: "c-peach", icon: "🧾", value: data.totales.movimientos, label: "Entradas y salidas" },
              { cls: "c-pink", icon: "💰", value: data.totales.valor_inventario, label: "Valor del inventario", money: true },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className={`stat-card ${s.cls}`}
                custom={i}
                initial="hidden"
                animate="show"
                variants={cardVariants}
              >
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">
                  {s.money ? <AnimatedNumber value={s.value} format={money} /> : <AnimatedNumber value={s.value} />}
                </div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid-2">
            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
              <div className="card-header">
                <h2>📦 Stock por material</h2>
                <Link to="/materiales" className="btn btn-ghost btn-sm">Ver catálogo completo</Link>
              </div>
              {data.inventario.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Material</th><th>Categoría</th><th>Stock actual</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {data.inventario.slice(0, 8).map((m) => (
                        <tr key={m.material_id}>
                          <td><strong>{m.nombre}</strong></td>
                          <td><span className="badge badge-cat">{m.categoria}</span></td>
                          <td>{m.stock_actual.toFixed(2)} {m.unidad}</td>
                          <td>
                            {m.stock_actual <= m.stock_minimo ? (
                              <span className="badge badge-stock-bajo">⚠ Bajo mínimo</span>
                            ) : (
                              <span className="badge badge-stock-ok">✓ Saludable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><div className="ic">📭</div>Aún no hay materiales registrados.</div>
              )}
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}>
              <div className="card-header"><h2>⚠️ Alertas de stock mínimo</h2></div>
              {data.alertas.length ? (
                <div className="tag-list" style={{ flexDirection: "column", gap: 12 }}>
                  {data.alertas.map((m) => (
                    <div
                      key={m.material_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--danger-bg)",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div>
                        <strong>{m.nombre}</strong>
                        <br />
                        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          Mínimo: {m.stock_minimo} {m.unidad}
                        </span>
                      </div>
                      <span className="badge badge-stock-bajo">{m.stock_actual.toFixed(2)} {m.unidad}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><div className="ic">✅</div>Todo el inventario está por encima del mínimo.</div>
              )}
            </motion.div>
          </div>

          <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <div className="card-header">
              <h2>🕒 Movimientos recientes</h2>
              <Link to="/movimientos" className="btn btn-ghost btn-sm">Ver historial completo</Link>
            </div>
            {data.recientes.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Fecha</th><th>Tipo</th><th>Material</th><th>Obra</th><th>Cantidad</th><th>Costo total</th></tr>
                  </thead>
                  <tbody>
                    {data.recientes.map((m) => (
                      <tr key={m.movimiento_id}>
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
                        <td>{money(m.costo_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="ic">🧾</div>Todavía no se han registrado movimientos.</div>
            )}
          </motion.div>
        </>
      )}
    </Layout>
  );
}
