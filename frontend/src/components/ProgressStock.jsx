const defaultFormat = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Barra de progreso reutilizable.
 * variant="stock"  -> value entre 0 y max, con marcador de mínimo (dim_Materiales.stock_minimo/maximo).
 * variant="budget" -> value (gasto) contra max (presupuesto), sin marcador de mínimo.
 */
export default function ProgressStock({ value, max, min = 0, variant = "stock", unit = "", format }) {
  const fmt = format || defaultFormat;
  const safeMax = max > 0 ? max : Math.max(value, 1);
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const minPct = variant === "stock" ? Math.max(0, Math.min(100, (min / safeMax) * 100)) : null;

  const status =
    variant === "stock"
      ? value <= min
        ? "danger"
        : value <= min * 1.2
        ? "warning"
        : "ok"
      : pct >= 100
      ? "danger"
      : pct >= 80
      ? "warning"
      : "ok";

  return (
    <div className="progress-stock">
      <div className="progress-stock-track">
        <div className={`progress-stock-fill ${status}`} style={{ width: `${pct}%` }} />
        {minPct !== null && <div className="progress-stock-min-marker" style={{ left: `${minPct}%` }} title={`Mínimo: ${fmt(min)} ${unit}`} />}
      </div>
      <div className="progress-stock-meta">
        <span className={`progress-stock-value ${status}`}>
          {fmt(value)} {unit}
        </span>
        <span>{variant === "stock" ? `mín ${fmt(min)} · máx ${fmt(max)}` : `de ${fmt(max)} ${unit}`}</span>
      </div>
    </div>
  );
}
