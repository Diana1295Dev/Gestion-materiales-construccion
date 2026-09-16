import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import { api } from "../api/client";

const ESTADOS = ["activa", "completada", "suspendida"];

const empty = {
  nombre_obra: "",
  ubicacion: "",
  ciudad: "",
  presupuesto_total: "",
  estado: "activa",
  fecha_inicio: "",
  fecha_cierre: "",
  responsable: "",
};

export default function ObraForm() {
  const { obraId } = useParams();
  const editing = Boolean(obraId);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (editing) {
      api.get(`/obras/${obraId}`).then((obra) =>
        setForm({ ...obra, fecha_cierre: obra.fecha_cierre || "" })
      );
    }
  }, [obraId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/obras/${obraId}`, form);
      } else {
        await api.post("/obras", form);
      }
      navigate("/obras");
    } catch (err) {
      setMessage({ type: "error", text: `No se pudo guardar la obra: ${err.message}` });
    }
  };

  return (
    <Layout
      title={editing ? "Editar obra" : "Nueva obra"}
      subtitle={editing ? "Actualiza los datos del proyecto" : "Registra un nuevo proyecto de construcción"}
    >
      <Flash message={message} />
      <motion.div className="card" style={{ maxWidth: 760 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label>Nombre de la obra</label>
              <input name="nombre_obra" required maxLength={150} value={form.nombre_obra} onChange={onChange} placeholder="Ej. Torre Alameda - Etapa 2" />
            </div>
            <div className="field">
              <label>Ubicación</label>
              <input name="ubicacion" required maxLength={150} value={form.ubicacion} onChange={onChange} placeholder="Dirección o sector" />
            </div>
            <div className="field">
              <label>Ciudad</label>
              <input name="ciudad" required maxLength={50} value={form.ciudad} onChange={onChange} />
            </div>
            <div className="field">
              <label>Presupuesto total (COP)</label>
              <input type="number" step="0.01" min="0" name="presupuesto_total" required value={form.presupuesto_total} onChange={onChange} />
            </div>
            <div className="field">
              <label>Responsable de la obra</label>
              <input name="responsable" maxLength={100} value={form.responsable} onChange={onChange} />
            </div>
            <div className="field">
              <label>Estado</label>
              <select name="estado" required value={form.estado} onChange={onChange}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e[0].toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha de inicio</label>
              <input type="date" name="fecha_inicio" required value={form.fecha_inicio} onChange={onChange} />
            </div>
            <div className="field">
              <label>Fecha de cierre <span className="hint">(opcional)</span></label>
              <input type="date" name="fecha_cierre" value={form.fecha_cierre} onChange={onChange} />
            </div>
          </div>
          <div className="form-actions">
            <Link to="/obras" className="btn btn-ghost">Cancelar</Link>
            <button type="submit" className="btn btn-primary">{editing ? "Guardar cambios" : "Crear obra"}</button>
          </div>
        </form>
      </motion.div>
    </Layout>
  );
}
