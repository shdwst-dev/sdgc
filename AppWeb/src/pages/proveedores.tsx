import Layout from "./layout";
import "../styles/dashboard.css";

export default function Proveedores() {
  const proveedores = [
    {
      nombre: "Proveedor A",
      correo: "contacto@proveedora.com",
      telefono: "(555) 111-2222",
      productos: 25,
      ultimoPedido: "2026-02-15",
    },
    {
      nombre: "Proveedor B",
      correo: "info@proveedorb.com",
      telefono: "(555) 333-4444",
      productos: 18,
      ultimoPedido: "2026-02-10",
    },
    {
      nombre: "Proveedor C",
      correo: "ventas@proveedorc.com",
      telefono: "(555) 555-6666",
      productos: 32,
      ultimoPedido: "2026-02-12",
    },
  ];

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en proveedores..." />
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
          <h1>Proveedores</h1>
          <p>Consulta contactos, productos surtidos y el historial reciente de pedidos.</p>
        </div>
        <button className="inventory-primary-button" type="button">
          Agregar proveedor
        </button>
      </section>

      <section className="panel inventory-panel">
        <div className="customers-filters">
          <input type="text" placeholder="Buscar proveedores por nombre o contacto..." />
          <select defaultValue="Todos">
            <option>Todos los tipos</option>
            <option>Abarrotes</option>
            <option>Bebidas</option>
            <option>Limpieza</option>
          </select>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Productos surtidos</th>
                <th>Último pedido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((proveedor) => (
                <tr key={proveedor.correo}>
                  <td>{proveedor.nombre}</td>
                  <td>
                    <div className="customer-contact">
                      <span>{proveedor.correo}</span>
                      <span>{proveedor.telefono}</span>
                    </div>
                  </td>
                  <td>{proveedor.productos}</td>
                  <td>{proveedor.ultimoPedido}</td>
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
