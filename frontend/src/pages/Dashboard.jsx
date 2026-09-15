import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import Layout from "../components/Layout";
import AnimatedNumber from "../components/AnimatedNumber";
import { api } from "../api/client";

const money = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const moneyShort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

function KpiVariation({ actual, anterior, deltaPct, format }) {
  const fmt = (n) => (format ? format(n) : n);
  if (!anterior) {
    if (!actual) return <span className="kpi-variation neutral">Sin cambios este mes</span>;
    return (
      <span className="kpi-variation neutral">
        {fmt(actual)} este mes · sin dato del mes anterior
      </span>
    );
  }
  const diff = actual - anterior;
  const cls = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  const text = deltaPct != null ? `${Math.abs(deltaPct).toFixed(1)}%` : fmt(Math.abs(diff));
  return (
    <span className={`kpi-variation ${cls}`}>
      {arrow} {text} vs. mes anterior
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span className="dot" style={{ background: p.color }} />
          {p.name}: <strong>&nbsp;{money(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [series, setSeries] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(setData).catch((e) => setError(e.message));
    api.get("/dashboard/series?meses=12").then(setSeries).catch(() => {});
  }, []);

  const chartMeses = (series?.meses || []).map((m) => ({
    ...m,
    label: `${m.nombre_mes.slice(0, 3)} ${m.anio}`,
  }));
  const variacion = series?.variacion;

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
              {
                cls: "c-lavender",
                icon: "🏢",
                value: data.totales.obras_activas,
                label: "Obras en marcha",
                variation: variacion && (
                  <KpiVariation actual={variacion.obras_nuevas.actual} anterior={variacion.obras_nuevas.anterior} deltaPct={variacion.obras_nuevas.delta_pct} />
                ),
              },
              {
                cls: "c-mint",
                icon: "🧱",
                value: data.totales.materiales,
                label: "Materiales registrados",
                variation: variacion && (
                  <KpiVariation actual={variacion.materiales_nuevos.actual} anterior={variacion.materiales_nuevos.anterior} deltaPct={variacion.materiales_nuevos.delta_pct} />
                ),
              },
              {
                cls: "c-peach",
                icon: "🧾",
                value: data.totales.movimientos,
                label: "Entradas y salidas",
                variation: variacion && (
                  <KpiVariation actual={variacion.movimientos.actual} anterior={variacion.movimientos.anterior} deltaPct={variacion.movimientos.delta_pct} />
                ),
              },
              {
                cls: "c-pink",
                icon: "💰",
                value: data.totales.valor_inventario,
                label: "Valor del inventario",
                money: true,
                variation: variacion && (
                  <KpiVariation actual={variacion.valor_inventario.actual} anterior={variacion.valor_inventario.anterior} deltaPct={variacion.valor_inventario.delta_pct} format={money} />
                ),
              },
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
                {s.variation}
              </motion.div>
            ))}
          </div>

          <div className="grid-charts">
            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <div className="card-header">
                <h2>📊 Entradas vs. salidas por mes</h2>
              </div>
              {chartMeses.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartMeses} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={moneyShort} width={56} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(30, 58, 95, 0.05)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="entradas" name="Entradas" fill="#2F9E63" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="salidas" name="Salidas" fill="#D14D4D" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="ic">📊</div>Aún no hay movimientos suficientes para graficar.</div>
              )}
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}>
              <div className="card-header">
                <h2>📈 Valor de inventario en el tiempo</h2>
              </div>
              {chartMeses.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartMeses}>
                    <defs>
                      <linearGradient id="valorInventarioFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F6FB0" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2F6FB0" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={moneyShort} width={56} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2F6FB0", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="valor_inventario_acumulado"
                      name="Valor de inventario"
                      stroke="#2F6FB0"
                      strokeWidth={2}
                      fill="url(#valorInventarioFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="ic">📈</div>Aún no hay historial suficiente para graficar.</div>
              )}
            </motion.div>
          </div>

          <div className="grid-2">
            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}>
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

            <motion.div className="card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}>
              <div className="card-header"><h2>⚠️ Alertas de stock mínimo</h2></div>
              {data.alertas.length ? (
                <div className="alert-list">
                  {data.alertas.map((m) => {
                    const pct = m.stock_minimo > 0 ? Math.min(100, (m.stock_actual / m.stock_minimo) * 100) : 0;
                    return (
                      <div key={m.material_id} className="alert-row">
                        <div className="alert-row-top">
                          <strong>{m.nombre}</strong>
                          <span className="badge badge-stock-bajo">{m.stock_actual.toFixed(2)} {m.unidad}</span>
                        </div>
                        <div className="progress-bar">
                          <div style={{ width: `${pct}%`, background: "var(--color-danger)" }} />
                        </div>
                        <span className="hint">Mínimo requerido: {m.stock_minimo} {m.unidad}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state"><div className="ic">✅</div>Todo el inventario está por encima del mínimo.</div>
              )}
            </motion.div>
          </div>

          <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.4 }}>
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
