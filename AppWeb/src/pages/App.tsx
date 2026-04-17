import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, Component, type ReactElement, type ReactNode, type ErrorInfo } from "react";
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

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PageErrorBoundary]", error, info);
  }

  componentDidUpdate(prevProps: { children: ReactNode }) {
    // Reset when the page changes (children swap out on route change)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "32px", color: "#7f1d1d", fontFamily: "Arial, sans-serif" }}>
          <h2>Ocurrió un error en esta página</h2>
          <p style={{ color: "#374151" }}>{this.state.message}</p>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Usa el menú lateral para navegar a otra sección.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}


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

function SessionExpiredRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => navigate("/", { replace: true });
    window.addEventListener("app:session-expired", handler);
    return () => window.removeEventListener("app:session-expired", handler);
  }, [navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <SessionExpiredRedirector />
      <PageErrorBoundary>
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
      </PageErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
