import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Flash from "../components/Flash";
import { api } from "../api/client";

const UNIDADES = ["kg", "m3", "m2", "unidad", "bolsa", "litro", "varilla", "rollo"];
const CATEGORIAS = ["Estructural", "Acabados", "Fundacion", "Instalaciones", "Herramientas"];

const empty = {
  nombre: "",
  categoria: CATEGORIAS[0],
  unidad: UNIDADES[0],
  costo_unitario: "",
  stock_minimo: 0,
  stock_maximo: 1000,
  descripcion: "",
};

export default function MaterialForm() {
  const { materialId } = useParams();
  const editing = Boolean(materialId);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (editing) {
      api.get(`/materiales/${materialId}`).then(setForm);
    }
  }, [materialId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/materiales/${materialId}`, form);
      } else {
        await api.post("/materiales", form);
      }
      navigate("/materiales");
    } catch (err) {
      setMessage({ type: "error", text: `No se pudo guardar el material: ${err.message}` });
    }
  };

  return (
    <Layout
      title={editing ? "Editar material" : "Nuevo material"}
      subtitle={editing ? "Actualiza los datos del material" : "Agrega un material al catálogo"}
    >
      <Flash message={message} />
      <div className="card" style={{ maxWidth: 760 }}>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label>Nombre del material</label>
              <input name="nombre" required maxLength={120} value={form.nombre} onChange={onChange} placeholder="Ej. Cemento gris tipo I" />
            </div>
            <div className="field">
              <label>Categoría</label>
              <select name="categoria" required value={form.categoria} onChange={onChange}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Unidad de medida</label>
              <select name="unidad" required value={form.unidad} onChange={onChange}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Costo unitario (USD)</label>
              <input type="number" step="0.01" min="0" name="costo_unitario" required value={form.costo_unitario} onChange={onChange} />
            </div>
            <div className="field">
              <label>Stock mínimo</label>
              <input type="number" step="0.01" min="0" name="stock_minimo" value={form.stock_minimo} onChange={onChange} />
            </div>
            <div className="field">
              <label>Stock máximo</label>
              <input type="number" step="0.01" min="0" name="stock_maximo" value={form.stock_maximo} onChange={onChange} />
            </div>
            <div className="field full">
              <label>Descripción <span className="hint">(opcional)</span></label>
              <textarea name="descripcion" maxLength={200} value={form.descripcion} onChange={onChange}></textarea>
            </div>
          </div>
          <div className="form-actions">
            <Link to="/materiales" className="btn btn-ghost">Cancelar</Link>
            <button type="submit" className="btn btn-primary">{editing ? "Guardar cambios" : "Crear material"}</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
