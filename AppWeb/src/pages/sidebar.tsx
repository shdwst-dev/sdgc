import { NavLink, useNavigate } from "react-router-dom";
import logo from "/src/assets/LogoPI.png";

const menuItems = [
  { to: "/dashboard", label: "Inicio" },
  { to: "/inventario", label: "Inventario / Almacen" },
  { to: "/compras", label: "Compras" },
  { to: "/ventas", label: "Ventas" },
  { to: "/clientes", label: "Clientes" },
  { to: "/proveedores", label: "Proveedores" },
  { to: "/facturacion", label: "Facturacion" },
  { to: "/reportes", label: "Reportes" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const rolUsuario = localStorage.getItem("rolUsuario");

  const menuVisible =
    rolUsuario === "Vendedor"
      ? menuItems.filter((item) => item.to === "/ventas" || item.to === "/reportes")
      : rolUsuario === "Comprador"
        ? menuItems.filter((item) => item.to === "/compras")
      : menuItems;

  const cerrarSesion = () => {
    localStorage.removeItem("rolUsuario");
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Logo del proyecto" className="project-logo" />
      </div>

      <nav className="sidebar-menu" aria-label="Navegacion principal">
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

          {rolUsuario === "Administrador" ? (
            <NavLink
              to="/configuracion"
              className={({ isActive }) => `sidebar-action${isActive ? " active" : ""}`}
            >
              Configuracion
            </NavLink>
          ) : null}

          <button type="button" className="sidebar-action" onClick={cerrarSesion}>
            Cerrar sesion
          </button>
        </div>
      </nav>
    </aside>
  );
}
