import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Obras from "./pages/Obras";
import ObraForm from "./pages/ObraForm";
import Materiales from "./pages/Materiales";
import MaterialForm from "./pages/MaterialForm";
import MovimientoForm from "./pages/MovimientoForm";
import Movimientos from "./pages/Movimientos";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/obras" element={<Obras />} />
      <Route path="/obras/nueva" element={<ObraForm />} />
      <Route path="/obras/:obraId/editar" element={<ObraForm />} />
      <Route path="/materiales" element={<Materiales />} />
      <Route path="/materiales/nuevo" element={<MaterialForm />} />
      <Route path="/materiales/:materialId/editar" element={<MaterialForm />} />
      <Route path="/movimientos" element={<Movimientos />} />
      <Route path="/movimientos/nuevo" element={<MovimientoForm />} />
    </Routes>
  );
}
