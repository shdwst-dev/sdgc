import { NavLink, useNavigate } from "react-router-dom";
import logo from "/src/assets/LogoPI.png";
import { clearSession, getToken } from "../lib/auth";
import { postApi } from "../lib/api";

const menuItems = [
  { to: "/dashboard", label: "Inicio" },
  { to: "/inventario", label: "Inventario / Almacén" },
  { to: "/compras", label: "Compras a proveedor" },
  { to: "/compras-cliente", label: "Compras" },
  { to: "/ventas", label: "Ventas" },
  { to: "/clientes", label: "Clientes" },
  { to: "/proveedores", label: "Proveedores" },
  { to: "/facturacion", label: "Facturación" },
  { to: "/reportes", label: "Reportes" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const rolUsuario = localStorage.getItem("rolUsuario");

  const menuVisible =
    rolUsuario === "Vendedor"
      ? menuItems.filter((item) => item.to === "/ventas" || item.to === "/reportes")
      : rolUsuario === "Comprador"
        ? menuItems.filter((item) => item.to === "/compras-cliente")
        : menuItems.filter((item) => item.to !== "/compras-cliente");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Logo del proyecto" className="project-logo" />
      </div>

      <nav className="sidebar-menu" aria-label="Navegación principal">
        {menuVisible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-divider" />

          {rolUsuario === "Administrador" || rolUsuario === "Super Admin" ? (
            <NavLink
              to="/configuracion"
              className={({ isActive }) => `sidebar-action${isActive ? " active" : ""}`}
            >
              Configuración de la tienda
            </NavLink>
          ) : null}

          <button
            type="button"
            className="sidebar-action sidebar-action-danger"
            onClick={async () => {
              try {
                if (getToken()) {
                  await postApi<{ message?: string }>("/v1/auth/logout", {});
                }
              } catch (submitError) {
                console.error("Error al cerrar sesión en el servidor:", submitError);
              } finally {
                clearSession();
                navigate("/");
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}
