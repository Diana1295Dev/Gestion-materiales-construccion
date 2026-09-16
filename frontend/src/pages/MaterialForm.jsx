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
  tiempo_reposicion_dias: 15,
  lote_compra: 100,
  descripcion: "",
};

const today = new Date().toISOString().slice(0, 10);

export default function MaterialForm() {
  const { materialId } = useParams();
  const editing = Boolean(materialId);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const [sugerencia, setSugerencia] = useState(null);
  const [obras, setObras] = useState([]);
  const [tieneStock, setTieneStock] = useState(false);
  const [stockInicial, setStockInicial] = useState({ tipo: "ENTRADA", obra_id: "", cantidad: "" });

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
    } else {
      api.get("/obras?estado=activa").then(setObras).catch(() => {});
    }
  }, [materialId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onChangeStock = (e) => setStockInicial({ ...stockInicial, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      let material;
      if (editing) {
        material = await api.put(`/materiales/${materialId}`, form);
      } else {
        material = await api.post("/materiales", form);
      }

      if (!editing && tieneStock && stockInicial.cantidad && stockInicial.obra_id) {
        try {
          await api.post("/movimientos", {
            tipo_movimiento: stockInicial.tipo,
            obra_id: stockInicial.obra_id,
            material_id: material.material_id,
            cantidad: stockInicial.cantidad,
            costo_unitario: form.costo_unitario,
            fecha: today,
            observaciones: "Inventario inicial",
          });
        } catch (err) {
          setMessage({
            type: "error",
            text: `El material se creó, pero no se pudo registrar el stock inicial: ${err.message}`,
          });
          return;
        }
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
              <label>Costo unitario (COP)</label>
              <input type="number" step="0.01" min="0" name="costo_unitario" required value={form.costo_unitario} onChange={onChange} />
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
                <div className="suggestion-box">
                  <div className="suggestion-box-header">
                    <strong>📊 Stock mínimo y máximo (calculado automáticamente)</strong>
                  </div>
                  {sugerencia.meses_con_datos > 0 ? (
                    <>
                      <p>
                        Con {sugerencia.meses_con_datos} {sugerencia.meses_con_datos === 1 ? "mes" : "meses"} de
                        historial, la demanda diaria promedio es <strong>{sugerencia.demanda_diaria_promedio}</strong>{" "}
                        {form.unidad}/día. Con un tiempo de reposición de {sugerencia.tiempo_reposicion_dias} días y un
                        stock de seguridad de {sugerencia.stock_seguridad} {form.unidad}:
                      </p>
                      <p style={{ marginTop: 4 }}>
                        Mínimo = (demanda diaria × tiempo de reposición) + stock de seguridad ={" "}
                        <strong>{sugerencia.stock_minimo_sugerido}</strong> {form.unidad}
                        <br />
                        Máximo = mínimo + lote de compra ({sugerencia.lote_compra}) ={" "}
                        <strong>{sugerencia.stock_maximo_sugerido}</strong> {form.unidad}
                      </p>
                      {!sugerencia.suficiente && (
                        <p className="hint">
                          Con solo 1 mes de historial el cálculo es preliminar — se afina a medida que registres más
                          movimientos.
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{sugerencia.mensaje}</p>
                  )}
                  <p className="hint" style={{ marginTop: 6 }}>
                    Estos valores se recalculan solos cada vez que guardas el material o registras una salida — no se
                    editan a mano.
                  </p>
                </div>
              </div>
            )}

            <div className="field full">
              <label>Descripción <span className="hint">(opcional)</span></label>
              <textarea name="descripcion" maxLength={200} value={form.descripcion} onChange={onChange}></textarea>
            </div>

            {!editing && (
              <div className="field full">
                <label className="checkbox-label">
                  <input type="checkbox" checked={tieneStock} onChange={(e) => setTieneStock(e.target.checked)} />
                  Ya tengo stock de este material
                </label>
              </div>
            )}

            {!editing && tieneStock && (
              <>
                <div className="field full">
                  <label>Tipo de movimiento</label>
                  <div className="toggle-tipo">
                    <input
                      type="radio"
                      id="stock-entrada"
                      name="tipo"
                      checked={stockInicial.tipo === "ENTRADA"}
                      onChange={() => setStockInicial({ ...stockInicial, tipo: "ENTRADA" })}
                    />
                    <label htmlFor="stock-entrada" className="entrada">⬇ Entrada</label>
                    <input
                      type="radio"
                      id="stock-salida"
                      name="tipo"
                      checked={stockInicial.tipo === "SALIDA"}
                      onChange={() => setStockInicial({ ...stockInicial, tipo: "SALIDA" })}
                    />
                    <label htmlFor="stock-salida" className="salida">⬆ Salida</label>
                  </div>
                </div>
                <div className="field">
                  <label>Obra</label>
                  <select name="obra_id" required value={stockInicial.obra_id} onChange={onChangeStock}>
                    <option value="" disabled>Selecciona una obra</option>
                    {obras.map((o) => (
                      <option key={o.obra_id} value={o.obra_id}>{o.nombre_obra}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Cantidad <span className="hint">({form.unidad})</span></label>
                  <input type="number" step="0.01" min="0.01" name="cantidad" required value={stockInicial.cantidad} onChange={onChangeStock} />
                </div>
              </>
            )}
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
