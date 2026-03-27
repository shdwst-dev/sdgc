import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Login from "./login";
import Dashboard from "./dashboard";
import Inventario from "./inventario";
import Compras from "./compras";
import ComprasCliente from "./compras-cliente";
import Ventas from "./ventas";
import Clientes from "./clientes";
import Proveedores from "./proveedores";
import Facturacion from "./facturacion";
import Reportes from "./reportes";
import Configuracion from "./configuracion";
import { getStoredRole, getToken } from "../lib/auth";

type Rol = "Administrador" | "Super Admin" | "Vendedor" | "Comprador" | null;

function obtenerRol(): Rol {
  const rol = getStoredRole();

  if (rol === "Administrador" || rol === "Super Admin" || rol === "Vendedor" || rol === "Comprador") {
    return rol;
  }

  return null;
}

function RutaProtegida({
  element,
  permitidos,
}: {
  element: ReactElement;
  permitidos?: Array<Exclude<Rol, null>>;
}) {
  const token = getToken();
  const rol = obtenerRol();

  if (!token || !rol) {
    return <Navigate to="/" replace />;
  }

  if (permitidos && !permitidos.includes(rol)) {
    const destino =
      rol === "Vendedor" ? "/ventas" : rol === "Comprador" ? "/compras-cliente" : "/dashboard";
    return <Navigate to={destino} replace />;
  }

  return element;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RutaProtegida element={<Dashboard />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/inventario" element={<RutaProtegida element={<Inventario />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/compras" element={<RutaProtegida element={<Compras />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/compras-cliente" element={<RutaProtegida element={<ComprasCliente />} permitidos={["Comprador"]} />} />
        <Route path="/ventas" element={<RutaProtegida element={<Ventas />} permitidos={["Administrador", "Super Admin", "Vendedor"]} />} />
        <Route path="/clientes" element={<RutaProtegida element={<Clientes />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/proveedores" element={<RutaProtegida element={<Proveedores />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/facturacion" element={<RutaProtegida element={<Facturacion />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/reportes" element={<RutaProtegida element={<Reportes />} permitidos={["Administrador", "Super Admin", "Vendedor"]} />} />
        <Route path="/configuracion" element={<RutaProtegida element={<Configuracion />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="/settings" element={<RutaProtegida element={<Configuracion />} permitidos={["Administrador", "Super Admin"]} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
