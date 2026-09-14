import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">🏗️</div>
        <div className="brand-text">
          Materiales
          <br />
          <span>Control de obra</span>
        </div>
      </div>

      <nav className="nav-group">
        <div className="nav-label">Principal</div>
        <NavLink to="/" end className={linkClass}>
          <span className="ic">📊</span> Dashboard
        </NavLink>
      </nav>

      <nav className="nav-group">
        <div className="nav-label">Movimientos</div>
        <NavLink to="/movimientos/nuevo" className={linkClass}>
          <span className="ic">➕</span> Registrar
        </NavLink>
        <NavLink to="/movimientos" end className={linkClass}>
          <span className="ic">🧾</span> Historial
        </NavLink>
      </nav>

      <nav className="nav-group">
        <div className="nav-label">Catálogos</div>
        <NavLink to="/obras" className={linkClass}>
          <span className="ic">🏢</span> Obras
        </NavLink>
        <NavLink to="/materiales" className={linkClass}>
          <span className="ic">🧱</span> Materiales
        </NavLink>
      </nav>
    </aside>
  );
}
