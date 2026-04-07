import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency, formatDate } from "../lib/format";
import { GoogleChart } from "../components/GoogleChart";
import { clearSession, getStoredUser, getToken, updateStoredUser } from "../lib/auth";
import { postApi, putApi } from "../lib/api";

type SessionUser = {
  id_usuario?: number;
  email?: string;
  rol?: string;
  persona?: {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string | null;
    telefono?: string;
  } | null;
};

type ProfileForm = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  email: string;
  contrasena: string;
};

const emptyProfileForm: ProfileForm = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  telefono: "",
  email: "",
  contrasena: "",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState<string | null>(null);
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<SessionUser | null>(getStoredUser() as SessionUser | null);
  const [perfilEditable, setPerfilEditable] = useState<ProfileForm>(emptyProfileForm);
  const { data, loading, error } = useApiData("/dashboard", {
    periodo_referencia: { fecha: "", mes: "" },
    metricas: {
      ingresos_hoy: 0,
      ingresos_mes: 0,
      gastos_mes: 0,
      ganancia_mes: 0,
    },
    flujo_mensual: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
      utilidad: [] as number[],
    },
  });
  const { data: graficaFlujo } = useApiData("/v1/graficas/ingresos-vs-gastos", {
    series: {
      labels: [] as string[],
      ingresos: [] as number[],
      gastos: [] as number[],
    },
  });
  const { data: topProductosData } = useApiData("/dashboard/top-productos", {
    top_productos: [] as Array<{
      nombre: string;
      cantidad: number;
    }>,
  });
  const { data: ventasRecientesData } = useApiData("/dashboard/ventas-recientes", {
    ventas_recientes: [] as Array<{
      factura: string;
      cliente: string;
      responsable: string;
      monto: number;
      fecha: string;
    }>,
  });
  const { data: alertasStockData } = useApiData("/dashboard/alertas-stock", {
    alertas_stock: [] as Array<{
      sku: string;
      producto: string;
      actual: number;
      minimo: number;
    }>,
  });

  useEffect(() => {
    const usuario = getStoredUser() as SessionUser | null;
    setUsuarioActual(usuario);
  }, []);

  useEffect(() => {
    if (!usuarioActual) {
      setPerfilEditable(emptyProfileForm);
      return;
    }

    setPerfilEditable({
      nombre: usuarioActual.persona?.nombre ?? "",
      apellido_paterno: usuarioActual.persona?.apellido_paterno ?? "",
      apellido_materno: usuarioActual.persona?.apellido_materno ?? "",
      telefono: usuarioActual.persona?.telefono ?? "",
      email: usuarioActual.email ?? "",
      contrasena: "",
    });
  }, [usuarioActual]);

  useEffect(() => {
    if (!menuAbierto) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuAbierto]);

  const subtituloIngresos = data.periodo_referencia.fecha
    ? formatDate(data.periodo_referencia.fecha)
    : "Sin referencia";

  const flowChartData = useMemo(
    () => [
      ["Dia", "Ingresos", "Gastos"],
      ...graficaFlujo.series.labels.map((label, index) => [
        label,
        graficaFlujo.series.ingresos[index] ?? 0,
        graficaFlujo.series.gastos[index] ?? 0,
      ]),
    ],
    [graficaFlujo.series],
  );

  const topProductsChartData = useMemo(
    () => [
      ["Producto", "Cantidad"],
      ...topProductosData.top_productos.map((producto) => [producto.nombre, producto.cantidad]),
    ],
    [topProductosData.top_productos],
  );

  const nombreCompletoUsuario = useMemo(() => {
    const persona = usuarioActual?.persona;

    if (!persona) {
      return "Usuario";
    }

    return [persona.nombre, persona.apellido_paterno, persona.apellido_materno]
      .filter((parte) => typeof parte === "string" && parte.trim().length > 0)
      .join(" ");
  }, [usuarioActual]);

  const cerrarSesion = async () => {
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
  };

  const abrirAjustes = () => {
    setPerfilMensaje(null);
    setPerfilError(null);
    setMenuAbierto(false);
    setAjustesAbiertos(true);
  };

  const guardarPerfil = async () => {
    setGuardandoPerfil(true);
    setPerfilMensaje(null);
    setPerfilError(null);

    try {
      const response = await putApi<{ message: string; usuario: SessionUser }>("/v1/auth/profile", {
        nombre: perfilEditable.nombre,
        apellido_paterno: perfilEditable.apellido_paterno,
        apellido_materno: perfilEditable.apellido_materno || null,
        telefono: perfilEditable.telefono,
        email: perfilEditable.email,
        contrasena: perfilEditable.contrasena || null,
      });

      updateStoredUser(response.usuario);
      setUsuarioActual(response.usuario);
      setPerfilEditable((actual) => ({
        ...actual,
        contrasena: "",
      }));
      setPerfilMensaje(response.message);
    } catch (submitError) {
      setPerfilError(submitError instanceof Error ? submitError.message : "No fue posible actualizar tu perfil.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  return (
    <Layout>
      <section className="dashboard-user-bar">
        <div>
          <p className="detail-section-label">Sesión activa</p>
          <h1 className="dashboard-user-title">Dashboard</h1>
        </div>

        <div className="dashboard-user-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="dashboard-user-button"
            onClick={() => setMenuAbierto((actual) => !actual)}
          >
            <span className="dashboard-user-avatar">{nombreCompletoUsuario.charAt(0).toUpperCase()}</span>
            <span className="dashboard-user-copy">
              <strong>{nombreCompletoUsuario}</strong>
              <small>{usuarioActual?.rol ?? "Sin rol"}</small>
            </span>
          </button>

          {menuAbierto ? (
            <div className="dashboard-user-dropdown">
              <button type="button" className="dashboard-user-dropdown-item" onClick={abrirAjustes}>
                Ajustes
              </button>
              <button type="button" className="dashboard-user-dropdown-item dashboard-user-dropdown-item-danger" onClick={cerrarSesion}>
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos ({subtituloIngresos})</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.ingresos_hoy)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ingresos ({data.periodo_referencia.mes || "Mes"})</span>
            <span>↗</span>
          </div>
          <h3>{formatCurrency(data.metricas.ingresos_mes)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Gastos ({data.periodo_referencia.mes || "Mes"})</span>
            <span>⌁</span>
          </div>
          <h3>{formatCurrency(data.metricas.gastos_mes)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Ganancia ({data.periodo_referencia.mes || "Mes"})</span>
            <span>▣</span>
          </div>
          <h3>{formatCurrency(data.metricas.ganancia_mes)}</h3>
        </div>
      </section>

      <section className="charts-grid">
        <div className="panel large-panel">
          <h4>Ingresos vs Gastos</h4>
          <GoogleChart
            type="LineChart"
            data={flowChartData}
            className="google-chart google-chart-large"
            options={{
              backgroundColor: "transparent",
              chartArea: { left: 60, right: 24, top: 24, bottom: 42, width: "100%", height: "72%" },
              colors: ["#1f4b99", "#d97706"],
              curveType: "function",
              legend: { position: "top", textStyle: { color: "#475569", fontSize: 12 } },
              hAxis: { textStyle: { color: "#64748b", fontSize: 11 } },
              vAxis: {
                minValue: 0,
                textStyle: { color: "#64748b", fontSize: 11 },
                gridlines: { color: "#e2e8f0" },
              },
              lineWidth: 3,
              pointSize: 5,
            }}
          />
        </div>

        <div className="panel small-panel">
          <h4>Productos más vendidos</h4>
          <GoogleChart
            type="BarChart"
            data={topProductsChartData}
            className="google-chart google-chart-small"
            options={{
              backgroundColor: "transparent",
              chartArea: { left: 150, right: 20, top: 20, bottom: 24, width: "100%", height: "76%" },
              colors: ["#2563eb"],
              legend: { position: "none" },
              hAxis: {
                minValue: 0,
                textStyle: { color: "#64748b", fontSize: 11 },
                gridlines: { color: "#e2e8f0" },
              },
              vAxis: { textStyle: { color: "#334155", fontSize: 12 } },
              bars: "horizontal",
            }}
          />
        </div>
      </section>

      <section className="tables-grid">
        <div className="panel">
          <h4>Ventas recientes</h4>
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Responsable</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ventasRecientesData.ventas_recientes.map((venta) => (
                <tr key={venta.factura}>
                  <td>{venta.factura}</td>
                  <td>{venta.cliente}</td>
                  <td>{venta.responsable}</td>
                  <td>{formatCurrency(venta.monto)}</td>
                  <td>{formatDate(venta.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h4>Alertas de bajo stock</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Actual</th>
                <th>Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {alertasStockData.alertas_stock.map((item) => (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.producto}</td>
                  <td>{item.actual}</td>
                  <td>{item.minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando informacion del dashboard...</p> : null}
      {error ? <p className="panel">Error al cargar datos: {error}</p> : null}

      {ajustesAbiertos ? (
        <div className="profile-modal-backdrop" role="presentation" onClick={() => setAjustesAbiertos(false)}>
          <section className="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="detail-card-header">
              <div>
                <p className="detail-section-label">Ajustes</p>
                <h3 id="profile-modal-title">Editar informacion personal</h3>
              </div>
              <button type="button" className="inventory-secondary-button" onClick={() => setAjustesAbiertos(false)}>
                Cerrar
              </button>
            </div>

            {perfilError ? <p className="form-message form-message-error">{perfilError}</p> : null}
            {perfilMensaje ? <p className="form-message form-message-success">{perfilMensaje}</p> : null}

            <div className="settings-form">
              <div className="settings-field">
                <label htmlFor="profile-nombre">Nombre</label>
                <input id="profile-nombre" value={perfilEditable.nombre} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, nombre: event.target.value }))} />
              </div>
              <div className="settings-field">
                <label htmlFor="profile-apellido-paterno">Apellido paterno</label>
                <input id="profile-apellido-paterno" value={perfilEditable.apellido_paterno} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, apellido_paterno: event.target.value }))} />
              </div>
              <div className="settings-field">
                <label htmlFor="profile-apellido-materno">Apellido materno</label>
                <input id="profile-apellido-materno" value={perfilEditable.apellido_materno} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, apellido_materno: event.target.value }))} />
              </div>
              <div className="settings-field">
                <label htmlFor="profile-telefono">Telefono</label>
                <input id="profile-telefono" value={perfilEditable.telefono} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, telefono: event.target.value }))} />
              </div>
              <div className="settings-field settings-field-full">
                <label htmlFor="profile-email">Correo</label>
                <input id="profile-email" type="email" value={perfilEditable.email} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, email: event.target.value }))} />
              </div>
              <div className="settings-field settings-field-full">
                <label htmlFor="profile-password">Nueva contrasena</label>
                <input id="profile-password" type="password" placeholder="Dejala vacia si no deseas cambiarla" value={perfilEditable.contrasena} onChange={(event) => setPerfilEditable((actual) => ({ ...actual, contrasena: event.target.value }))} />
                <small>Si la capturas, se actualizara en la base de datos.</small>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="inventory-primary-button" onClick={guardarPerfil} disabled={guardandoPerfil}>
                {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </Layout>
  );
}
