import { useEffect, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { putApi } from "../lib/api";

type ConfiguracionData = {
  negocio: {
    id_tienda: number | null;
    nombre: string;
    correo: string;
    telefono: string;
    calle: string;
    numero_exterior: string | number;
    numero_interior: string | number;
    direccion: string;
    ciudad: string;
    estado: string;
    cp: string | number;
    rfc: string;
  };
};

const initialForm = {
  nombre: "",
  correo: "",
  telefono: "",
  calle: "",
  numero_exterior: "",
  numero_interior: "",
  ciudad: "",
  estado: "",
  cp: "",
};

export default function Configuracion() {
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(initialForm);
  const { data, loading, error } = useApiData<ConfiguracionData>(`/configuracion?refresh=${reloadKey}`, {
    negocio: {
      id_tienda: null,
      nombre: "",
      correo: "",
      telefono: "",
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      direccion: "",
      ciudad: "",
      estado: "",
      cp: "",
      rfc: "",
    },
  });

  useEffect(() => {
    setFormulario({
      nombre: data.negocio.nombre ?? "",
      correo: data.negocio.correo ?? "",
      telefono: data.negocio.telefono ?? "",
      calle: data.negocio.calle ?? "",
      numero_exterior: String(data.negocio.numero_exterior ?? ""),
      numero_interior: String(data.negocio.numero_interior ?? ""),
      ciudad: data.negocio.ciudad ?? "",
      estado: data.negocio.estado ?? "",
      cp: String(data.negocio.cp ?? ""),
    });
  }, [data]);

  const actualizarCampo = (field: keyof typeof initialForm, value: string) => {
    setFormulario((actual) => ({ ...actual, [field]: value }));
  };

  const guardarConfiguracion = async () => {
    if (!formulario.nombre || !formulario.calle || !formulario.numero_exterior || !formulario.ciudad || !formulario.estado) {
      setFormError("Completa nombre del negocio, calle, numero exterior, ciudad y estado.");
      setFormSuccess(null);
      return;
    }

    setGuardando(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await putApi("/configuracion", {
        nombre: formulario.nombre,
        correo: formulario.correo || null,
        telefono: formulario.telefono || null,
        calle: formulario.calle,
        numero_exterior: Number(formulario.numero_exterior),
        numero_interior: formulario.numero_interior ? Number(formulario.numero_interior) : null,
        ciudad: formulario.ciudad,
        estado: formulario.estado,
        cp: formulario.cp ? Number(formulario.cp) : null,
        rfc: data.negocio.rfc || null,
      });

      setFormSuccess("Configuracion actualizada correctamente.");
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No fue posible guardar la configuracion.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Configuracion</h1>
          <p>Actualiza la informacion principal del negocio y la direccion de la tienda activa.</p>
        </div>
      </section>

      <section className="settings-layout settings-layout-single">
        <aside className="panel settings-sidebar-panel">
          <div className="settings-sidebar-summary">
            <p className="detail-section-label">Panel activo</p>
            <h3>{formulario.nombre || "Negocio"}</h3>
            <p>{formulario.ciudad || "Ciudad"}{formulario.estado ? `, ${formulario.estado}` : ""}</p>
          </div>
          <div className="settings-nav">
            <button type="button" className="settings-nav-item active">
              Perfil del negocio
            </button>
          </div>
        </aside>

        <section className="panel settings-content-panel">
          <div className="settings-panel-header">
            <div>
              <p className="detail-section-label">Datos generales</p>
              <h4>Perfil del negocio</h4>
            </div>
            <button type="button" className="inventory-primary-button settings-save-button" onClick={guardarConfiguracion} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}
          {formSuccess ? <p className="form-message form-message-success">{formSuccess}</p> : null}

          <div className="settings-form">
            <div className="settings-field settings-field-full">
              <label htmlFor="nombre-negocio">Nombre del negocio</label>
              <input id="nombre-negocio" type="text" value={formulario.nombre} onChange={(e) => actualizarCampo("nombre", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="correo-negocio">Correo electronico</label>
              <input id="correo-negocio" type="email" value={formulario.correo} onChange={(e) => actualizarCampo("correo", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="telefono-negocio">Telefono</label>
              <input id="telefono-negocio" type="tel" value={formulario.telefono} onChange={(e) => actualizarCampo("telefono", e.target.value)} />
            </div>

            <div className="settings-field settings-field-full">
              <label htmlFor="calle-negocio">Calle</label>
              <input id="calle-negocio" type="text" value={formulario.calle} onChange={(e) => actualizarCampo("calle", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="numero-exterior-negocio">Numero exterior</label>
              <input id="numero-exterior-negocio" type="number" min="1" value={formulario.numero_exterior} onChange={(e) => actualizarCampo("numero_exterior", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="numero-interior-negocio">Numero interior</label>
              <input id="numero-interior-negocio" type="number" min="1" value={formulario.numero_interior} onChange={(e) => actualizarCampo("numero_interior", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="cp-negocio">Codigo postal</label>
              <input id="cp-negocio" type="number" min="0" value={formulario.cp} onChange={(e) => actualizarCampo("cp", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="ciudad-negocio">Ciudad</label>
              <input id="ciudad-negocio" type="text" value={formulario.ciudad} onChange={(e) => actualizarCampo("ciudad", e.target.value)} />
            </div>

            <div className="settings-field">
              <label htmlFor="estado-negocio">Estado</label>
              <input id="estado-negocio" type="text" value={formulario.estado} onChange={(e) => actualizarCampo("estado", e.target.value)} />
            </div>

          </div>
        </section>
      </section>

      {loading ? <p className="panel">Cargando configuracion...</p> : null}
      {error ? <p className="panel">Error al cargar configuracion: {error}</p> : null}
    </Layout>
  );
}
