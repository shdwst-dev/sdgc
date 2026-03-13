import Layout from "./layout";
import "../styles/dashboard.css";

export default function Configuracion() {
  const secciones = [
    "Perfil del negocio",
    "Configuracion fiscal",
    "Usuarios y roles",
    "Metodos de pago",
    "Plantillas de factura",
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en configuración..." />
        </div>

        <div className="topbar-actions">
          <button className="icon-button" type="button">🔔</button>
          <select className="user-select" defaultValue={localStorage.getItem("rolUsuario") || "Administrador"}>
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Comprador</option>
          </select>
        </div>
      </header>

      <section className="inventory-header">
        <div>
          <h1>Configuración</h1>
          <p>Administra la información general del negocio y los parámetros principales del sistema.</p>
        </div>
      </section>

      <section className="settings-layout">
        <aside className="panel settings-sidebar-panel">
          <nav className="settings-nav" aria-label="Opciones de configuración">
            {secciones.map((seccion, index) => (
              <button
                key={seccion}
                type="button"
                className={`settings-nav-item${index === 0 ? " active" : ""}`}
              >
                {seccion}
              </button>
            ))}
          </nav>
        </aside>

        <section className="panel settings-content-panel">
          <h4>Perfil del negocio</h4>

          <div className="settings-form">
            <div className="settings-field settings-field-full">
              <label htmlFor="nombre-negocio">Nombre del negocio</label>
              <input id="nombre-negocio" type="text" placeholder="Nombre de tu negocio" />
            </div>

            <div className="settings-field">
              <label htmlFor="correo-negocio">Correo electrónico</label>
              <input id="correo-negocio" type="email" placeholder="negocio@ejemplo.com" />
            </div>

            <div className="settings-field">
              <label htmlFor="telefono-negocio">Teléfono</label>
              <input id="telefono-negocio" type="tel" placeholder="(555) 000-0000" />
            </div>

            <div className="settings-field settings-field-full">
              <label htmlFor="direccion-negocio">Dirección</label>
              <input id="direccion-negocio" type="text" placeholder="Calle y número" />
            </div>

            <div className="settings-field">
              <label htmlFor="ciudad-negocio">Ciudad</label>
              <input id="ciudad-negocio" type="text" placeholder="Ciudad" />
            </div>

            <div className="settings-field">
              <label htmlFor="estado-negocio">Estado</label>
              <input id="estado-negocio" type="text" placeholder="Estado" />
            </div>

            <div className="settings-field">
              <label htmlFor="cp-negocio">Código postal</label>
              <input id="cp-negocio" type="text" placeholder="12345" />
            </div>

            <div className="settings-field settings-field-full">
              <label htmlFor="rfc-negocio">RFC / Identificación fiscal</label>
              <input id="rfc-negocio" type="text" placeholder="00-0000000" />
            </div>
          </div>

          <button type="button" className="inventory-primary-button settings-save-button">
            Guardar cambios
          </button>
        </section>
      </section>
    </Layout>
  );
}
