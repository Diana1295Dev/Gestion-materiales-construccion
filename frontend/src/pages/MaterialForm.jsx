import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  tiempo_reposicion_dias: 15,
  lote_compra: 100,
  descripcion: "",
};

export default function MaterialForm() {
  const { materialId } = useParams();
  const editing = Boolean(materialId);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const [sugerencia, setSugerencia] = useState(null);

  useEffect(() => {
    if (editing) {
      api.get(`/materiales/${materialId}`).then((data) =>
        setForm({
          ...data,
          tiempo_reposicion_dias: data.tiempo_reposicion_dias ?? 15,
          lote_compra: data.lote_compra ?? 100,
        })
      );
      api.get(`/materiales/${materialId}/sugerencia-stock`).then(setSugerencia).catch(() => {});
    }
  }, [materialId]);

  const usarSugerencia = () => {
    if (!sugerencia?.stock_minimo_sugerido) return;
    setForm({
      ...form,
      stock_minimo: sugerencia.stock_minimo_sugerido,
      stock_maximo: sugerencia.stock_maximo_sugerido,
    });
  };

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
      <motion.div className="card" style={{ maxWidth: 760 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
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
            <div className="field">
              <label>Tiempo de reposición (días) <span className="hint">(lo que tarda en llegar un pedido)</span></label>
              <input type="number" step="1" min="1" name="tiempo_reposicion_dias" value={form.tiempo_reposicion_dias} onChange={onChange} />
            </div>
            <div className="field">
              <label>Lote de compra <span className="hint">(cantidad típica por pedido)</span></label>
              <input type="number" step="1" min="1" name="lote_compra" value={form.lote_compra} onChange={onChange} />
            </div>

            {editing && sugerencia && (
              <div className="field full">
                {sugerencia.suficiente || sugerencia.meses_con_datos > 0 ? (
                  <div className="suggestion-box">
                    <div className="suggestion-box-header">
                      <strong>📊 Sugerencia con base en el historial de salidas</strong>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={usarSugerencia}>
                        Usar sugerido
                      </button>
                    </div>
                    <p>
                      Con {sugerencia.meses_con_datos} {sugerencia.meses_con_datos === 1 ? "mes" : "meses"} de
                      historial, la demanda diaria promedio es <strong>{sugerencia.demanda_diaria_promedio}</strong>{" "}
                      {form.unidad}/día. Con un tiempo de reposición de {sugerencia.tiempo_reposicion_dias} días y un
                      stock de seguridad de {sugerencia.stock_seguridad} {form.unidad}:
                    </p>
                    <p style={{ marginTop: 4 }}>
                      Mínimo sugerido = (demanda diaria × tiempo de reposición) + stock de seguridad ={" "}
                      <strong>{sugerencia.stock_minimo_sugerido}</strong> {form.unidad}
                      <br />
                      Máximo sugerido = mínimo + lote de compra ({sugerencia.lote_compra}) ={" "}
                      <strong>{sugerencia.stock_maximo_sugerido}</strong> {form.unidad}
                    </p>
                    {!sugerencia.suficiente && (
                      <p className="hint">
                        Con solo 1 mes de historial la sugerencia es preliminar — se afina a medida que registres
                        más movimientos.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="suggestion-box">
                    <p>{sugerencia.mensaje}</p>
                  </div>
                )}
              </div>
            )}
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
      </motion.div>
    </Layout>
  );
}
