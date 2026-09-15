import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

function Item({ to, end, icon, children }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="nav-pill"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="ic">{icon}</span> {children}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <motion.div
        className="brand"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="brand-icon">🏗️</div>
        <div className="brand-text">
          Materiales
          <br />
          <span>Control de obra</span>
        </div>
      </motion.div>

      <nav className="nav-group">
        <div className="nav-label">Principal</div>
        <Item to="/" end icon="📊">Dashboard</Item>
      </nav>

      <nav className="nav-group">
        <div className="nav-label">Movimientos</div>
        <Item to="/movimientos/nuevo" icon="➕">Registrar</Item>
        <Item to="/movimientos" end icon="🧾">Historial</Item>
      </nav>

      <nav className="nav-group">
        <div className="nav-label">Catálogos</div>
        <Item to="/obras" icon="🏢">Obras</Item>
        <Item to="/materiales" icon="🧱">Materiales</Item>
      </nav>
    </aside>
  );
}
