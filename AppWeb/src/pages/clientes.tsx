import Layout from "./layout";
import "../styles/dashboard.css";

export default function Clientes() {
  const clientes = [
    {
      nombre: "Cliente A",
      correo: "cliente.a@email.com",
      telefono: "(555) 123-4567",
      compras: "$2,500.00",
      ultimaCompra: "2026-02-15",
      estado: "Activo",
    },
    {
      nombre: "Cliente B",
      correo: "cliente.b@email.com",
      telefono: "(555) 234-5678",
      compras: "$1,200.00",
      ultimaCompra: "2026-02-10",
      estado: "Activo",
    },
    {
      nombre: "Cliente C",
      correo: "cliente.c@email.com",
      telefono: "(555) 345-6789",
      compras: "$5,800.00",
      ultimaCompra: "2026-02-18",
      estado: "VIP",
    },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en clientes..." />
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
          <h1>Clientes</h1>
          <p>Consulta historial de compras, datos de contacto y el valor de cada cliente.</p>
        </div>
        <button className="inventory-primary-button" type="button">
          Agregar cliente
        </button>
      </section>

      <section className="panel inventory-panel">
        <div className="customers-filters">
          <input type="text" placeholder="Buscar clientes por nombre, correo o teléfono..." />
          <select defaultValue="Todos">
            <option>Todos los estados</option>
            <option>Activo</option>
            <option>VIP</option>
            <option>Inactivo</option>
          </select>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo / Teléfono</th>
                <th>Total comprado</th>
                <th>Última compra</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.correo}>
                  <td>{cliente.nombre}</td>
                  <td>
                    <div className="customer-contact">
                      <span>{cliente.correo}</span>
                      <span>{cliente.telefono}</span>
                    </div>
                  </td>
                  <td>{cliente.compras}</td>
                  <td>{cliente.ultimaCompra}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        cliente.estado === "VIP" ? "customer-status-vip" : "inventory-status-ok"
                      }`}
                    >
                      {cliente.estado}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" className="customer-action-button">Ver</button>
                      <button type="button" className="customer-action-button">Editar</button>
                      <button type="button" className="customer-action-button">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
