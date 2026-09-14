import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api/client";

const money = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <p>Cargando…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card c-lavender">
              <div className="stat-icon">🏢</div>
              <div className="stat-value">{data.totales.obras_activas}</div>
              <div className="stat-label">Obras en marcha</div>
            </div>
            <div className="stat-card c-mint">
              <div className="stat-icon">🧱</div>
              <div className="stat-value">{data.totales.materiales}</div>
              <div className="stat-label">Materiales registrados</div>
            </div>
            <div className="stat-card c-peach">
              <div className="stat-icon">🧾</div>
              <div className="stat-value">{data.totales.movimientos}</div>
              <div className="stat-label">Entradas y salidas</div>
            </div>
            <div className="stat-card c-pink">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{money(data.totales.valor_inventario)}</div>
              <div className="stat-label">Valor del inventario</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
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
            </div>

            <div className="card">
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
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
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
          </div>
        </>
      )}
    </Layout>
  );
}
