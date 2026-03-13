import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Login from "./login";
import Dashboard from "./dashboard";
import Inventario from "./inventario";
import Compras from "./compras";
import Ventas from "./ventas";
import Clientes from "./clientes";
import Proveedores from "./proveedores";
import Facturacion from "./facturacion";
import Reportes from "./reportes";
import Configuracion from "./configuracion";

type Rol = "Administrador" | "Vendedor" | "Comprador" | null;

function obtenerRol(): Rol {
  const rol = localStorage.getItem("rolUsuario");

  if (rol === "Administrador" || rol === "Vendedor" || rol === "Comprador") {
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
  const rol = obtenerRol();

  if (!rol) {
    return <Navigate to="/" replace />;
  }

  if (permitidos && !permitidos.includes(rol)) {
    const destino =
      rol === "Vendedor" ? "/ventas" : rol === "Comprador" ? "/compras" : "/dashboard";
    return <Navigate to={destino} replace />;
  }

  return element;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RutaProtegida element={<Dashboard />} permitidos={["Administrador"]} />} />
        <Route path="/inventario" element={<RutaProtegida element={<Inventario />} permitidos={["Administrador"]} />} />
        <Route path="/compras" element={<RutaProtegida element={<Compras />} permitidos={["Administrador", "Comprador"]} />} />
        <Route path="/ventas" element={<RutaProtegida element={<Ventas />} permitidos={["Administrador", "Vendedor"]} />} />
        <Route path="/clientes" element={<RutaProtegida element={<Clientes />} permitidos={["Administrador"]} />} />
        <Route path="/proveedores" element={<RutaProtegida element={<Proveedores />} permitidos={["Administrador"]} />} />
        <Route path="/facturacion" element={<RutaProtegida element={<Facturacion />} permitidos={["Administrador"]} />} />
        <Route path="/reportes" element={<RutaProtegida element={<Reportes />} permitidos={["Administrador", "Vendedor"]} />} />
        <Route path="/configuracion" element={<RutaProtegida element={<Configuracion />} permitidos={["Administrador"]} />} />
        <Route path="/settings" element={<RutaProtegida element={<Configuracion />} permitidos={["Administrador"]} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
