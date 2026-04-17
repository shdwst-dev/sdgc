import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";
import { fetchApi, postApi, putApi, getAssetUrl } from "../lib/api";
import { getStoredUser, updateStoredUser } from "../lib/auth";
import { downloadInvoicePdf, type InvoicePdfData } from "../lib/pdf";
import { ProductCatalog } from "../components/sales/CatalogoProductos";
import { useSaleCheckout } from "../hooks/useSaleCheckout";
import type { MetodoPago, ProductoVenta } from "../components/sales/types";

type ProductoInventario = {
  id_producto: number;
  sku: string;
  producto: string;
  imagen_url?: string | null;
  precio: number;
  stock: number;
  stock_por_tienda: Array<{
    id_tienda: number;
    tienda: string;
    stock_actual: number;
    stock_minimo: number;
  }>;
};

type CompraHistorial = {
  id_venta: number;
  folio: string;
  fecha: string;
  metodo_pago: string;
  estado: string;
  tienda: string | null;
  articulos: number;
  total: number;
  detalles: Array<{
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    imagen_url?: string | null;
  }>;
};

type UsuarioSesion = {
  id_usuario?: number;
  email?: string;
  rol?: string;
  estatus?: string;
  tienda?: {
    id_tienda?: number;
    nombre?: string;
  } | null;
  persona?: {
    nombre?: string;
    apellido_paterno?: string;
    apellido_materno?: string | null;
    telefono?: string;
    direccion?: {
      numero_ext?: string | null;
      numero_int?: string | null;
      calle?: {
        nombre?: string;
        colonia?: {
          nombre?: string;
          cp?: string | null;
          municipio?: {
            nombre?: string;
            estado?: {
              nombre?: string;
              pais?: {
                nombre?: string;
              } | null;
            } | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

type InfoSection = "perfil" | "historial";

type ProfileForm = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  email: string;
  contrasena: string;
};

function formatDateTime(value: string) {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha invalida";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export default function ComprasCliente() {
  const historialRef = useRef<HTMLDivElement | null>(null);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => getStoredUser() as UsuarioSesion | null);
  const [busqueda, setBusqueda] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [seccionInfoAbierta, setSeccionInfoAbierta] = useState<InfoSection>("perfil");
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState<string | null>(null);
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [facturaError, setFacturaError] = useState<string | null>(null);
  const [descargandoFacturaId, setDescargandoFacturaId] = useState<number | null>(null);
  const [perfilEditable, setPerfilEditable] = useState<ProfileForm>({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    telefono: "",
    email: "",
    contrasena: "",
  });
  const { data: inventarioData, loading, error } = useApiData(`/inventario?refresh=${reloadKey}&catalogo_global=1&incluir_inactivos=1`, {
    metricas: {
      productos_activos: 0,
      stock_total: 0,
      alertas_activas: 0,
      valor_inventario: 0,
    },
    categorias: [] as string[],
    catalogos: {
      subcategorias: [] as Array<{ id_subcategoria: number; nombre: string; categoria: string }>,
      medidas: [] as Array<{ id_medida: number; altura: number | null; ancho: number | null; peso: number | null; volumen: number | null }>,
      unidades: [] as Array<{ id_unidad: number; nombre: string; abreviatura: string }>,
      estatus: [] as Array<{ id_estatus: number; nombre: string }>,
      tiendas: [] as Array<{ id_tienda: number; nombre: string }>,
    },
    productos: [] as ProductoInventario[],
  });
  const { data: ventasData } = useApiData("/ventas", {
    productos: [] as ProductoVenta[],
    catalogos: {
      clientes: [] as Array<{ id_usuario: number; nombre: string; email: string }>,
      metodos_pago: [] as MetodoPago[],
      tiendas: [] as Array<{ id_tienda: number; nombre: string }>,
    },
    venta_en_curso: {
      cliente: "",
      cliente_id: null as number | null,
      id_metodo_pago: null as number | null,
      id_tienda: null as number | null,
      carrito: [] as Array<{
        producto_id: number;
        sku: string;
        nombre: string;
        precio_unitario: number;
        cantidad: number;
        total: number;
        descuento: string | null;
      }>,
      resumen: {
        subtotal: 0,
        iva: 0,
        total: 0,
      },
    },
  });
  const { data: historialData, loading: historialLoading, error: historialError } = useApiData("/v1/ventas/historial", {
    compras: [] as CompraHistorial[],
  });

  const productos = useMemo<ProductoVenta[]>(
    () => inventarioData.productos.map((producto) => ({
      id_producto: producto.id_producto,
      sku: producto.sku,
      nombre: producto.producto,
      imagen: producto.imagen_url ?? null,
      precio: producto.precio,
      stock: producto.stock,
      stock_por_tienda: producto.stock_por_tienda.map((stock) => ({
        id_tienda: stock.id_tienda,
        tienda: stock.tienda,
        stock: stock.stock_actual,
      })),
    })),
    [inventarioData.productos],
  );

  const metodoTransferencia = useMemo(
    () => ventasData.catalogos.metodos_pago.find((metodo) => metodo.nombre.toLowerCase() === "transferencia"),
    [ventasData.catalogos.metodos_pago],
  );

  const nombreCompletoUsuario = useMemo(() => {
    const persona = usuario?.persona;

    return [
      persona?.nombre,
      persona?.apellido_paterno,
      persona?.apellido_materno,
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ") || "Comprador";
  }, [usuario]);

  const direccionUsuario = useMemo(() => {
    const direccion = usuario?.persona?.direccion;

    if (!direccion?.calle?.nombre) {
      return "Sin dirección registrada";
    }

    return [
      direccion.calle.nombre,
      direccion.numero_ext ? `Ext. ${direccion.numero_ext}` : null,
      direccion.numero_int ? `Int. ${direccion.numero_int}` : null,
      direccion.calle.colonia?.nombre,
      direccion.calle.colonia?.municipio?.nombre,
      direccion.calle.colonia?.municipio?.estado?.nombre,
      direccion.calle.colonia?.cp ? `CP ${direccion.calle.colonia.cp}` : null,
      direccion.calle.colonia?.municipio?.estado?.pais?.nombre,
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(", ");
  }, [usuario]);

  useEffect(() => {
    setPerfilEditable({
      nombre: usuario?.persona?.nombre ?? "",
      apellido_paterno: usuario?.persona?.apellido_paterno ?? "",
      apellido_materno: usuario?.persona?.apellido_materno ?? "",
      telefono: usuario?.persona?.telefono ?? "",
      email: usuario?.email ?? "",
      contrasena: "",
    });
  }, [usuario]);

  const restablecerPerfilEditable = () => {
    setPerfilEditable({
      nombre: usuario?.persona?.nombre ?? "",
      apellido_paterno: usuario?.persona?.apellido_paterno ?? "",
      apellido_materno: usuario?.persona?.apellido_materno ?? "",
      telefono: usuario?.persona?.telefono ?? "",
      email: usuario?.email ?? "",
      contrasena: "",
    });
  };

  const {
    carrito,
    mostrarCheckout,
    obtenerStockDisponible,
    productosOcultos,
    resumen,
    ventaError,
    ventaSuccess,
    setMostrarCheckout,
    setVentaError,
    setVentaSuccess,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    reiniciarVenta,
  } = useSaleCheckout({
    productos,
    tiendaSeleccionada: "",
    requireStoreSelection: false,
  });

  const productosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    const productosDisponibles = productos.filter(
      (producto) => !productosOcultos.has(producto.id_producto),
    );

    if (!query) {
      return productosDisponibles;
    }

    return productosDisponibles.filter((producto) =>
      (producto.nombre ?? "").toLowerCase().includes(query) ||
      (producto.sku ?? "").toLowerCase().includes(query),
    );
  }, [busqueda, productos, productosOcultos]);

  useEffect(() => {
    if (!historialAbierto) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!historialRef.current?.contains(event.target as Node)) {
        setHistorialAbierto(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [historialAbierto]);

  const completarCompra = async () => {
    if (!usuario?.id_usuario) {
      setVentaError("No fue posible identificar al comprador actual.");
      setVentaSuccess(null);
      return;
    }

    if (!metodoTransferencia) {
      setVentaError("No existe el método de pago Transferencia.");
      setVentaSuccess(null);
      return;
    }

    if (carrito.length === 0) {
      setVentaError("Agrega al menos un artículo al carrito.");
      setVentaSuccess(null);
      return;
    }

    setGuardandoCompra(true);
    setVentaError(null);
    setVentaSuccess(null);

    try {
      await postApi("/v1/ventas/registrar", {
        id_usuario: usuario.id_usuario,
        id_metodo_pago: metodoTransferencia.id_metodo_pago,
        detalles: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      reiniciarVenta();
      setVentaSuccess("Compra registrada correctamente. Tu pedido quedó generado con pago por transferencia.");
      localStorage.setItem("sdgc_inventory_refresh", String(Date.now()));
      window.dispatchEvent(new CustomEvent("sdgc:inventory-refresh"));
      setReloadKey((actual) => actual + 1);
    } catch (submitError) {
      setVentaError(submitError instanceof Error ? submitError.message : "No fue posible registrar la compra.");
    } finally {
      setGuardandoCompra(false);
    }
  };

  const guardarPerfil = async () => {
    setGuardandoPerfil(true);
    setPerfilMensaje(null);
    setPerfilError(null);

    try {
      const response = await putApi<{ message: string; usuario: UsuarioSesion }>("/v1/auth/profile", {
        nombre: perfilEditable.nombre,
        apellido_paterno: perfilEditable.apellido_paterno,
        apellido_materno: perfilEditable.apellido_materno || null,
        telefono: perfilEditable.telefono,
        email: perfilEditable.email,
        contrasena: perfilEditable.contrasena || null,
      });

      updateStoredUser(response.usuario);
      setUsuario(response.usuario);
      setEditandoPerfil(false);
      setPerfilEditable((actual) => ({ ...actual, contrasena: "" }));
      setPerfilMensaje(response.message);
    } catch (submitError) {
      setPerfilError(submitError instanceof Error ? submitError.message : "No fue posible actualizar tu información.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const descargarFactura = async (idVenta: number) => {
    setDescargandoFacturaId(idVenta);
    setFacturaError(null);

    try {
      const response = await fetchApi<{ factura: InvoicePdfData }>(`/v1/ventas/${idVenta}/factura`);
      downloadInvoicePdf(response.factura);
    } catch (submitError) {
      setFacturaError(submitError instanceof Error ? submitError.message : "No fue posible descargar la factura.");
    } finally {
      setDescargandoFacturaId(null);
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Compras</h1>
          <p>Explora el catálogo, agrega artículos al carrito y genera tu compra con pago por transferencia.</p>
        </div>

        <div className="purchase-history-trigger" ref={historialRef}>
          <button
            type="button"
            className="inventory-secondary-button"
            onClick={() => {
              setHistorialAbierto((actual) => !actual);
              setSeccionInfoAbierta("perfil");
            }}
          >
            Mi información
          </button>

          {historialAbierto ? (
            <section className="panel purchase-history-popover">
              <div className="purchase-info-header">
                <div>
                  <h3>{nombreCompletoUsuario}</h3>
                  <p>Consulta tus datos personales y revisa tu historial de compras.</p>
                </div>
                <strong>{usuario?.rol ?? "Comprador"}</strong>
              </div>

              <div className="purchase-info-tabs">
                <button
                  type="button"
                  className={seccionInfoAbierta === "perfil" ? "purchase-info-tab purchase-info-tab-active" : "purchase-info-tab"}
                  onClick={() => setSeccionInfoAbierta("perfil")}
                >
                  Ver información
                </button>
                <button
                  type="button"
                  className={seccionInfoAbierta === "historial" ? "purchase-info-tab purchase-info-tab-active" : "purchase-info-tab"}
                  onClick={() => setSeccionInfoAbierta("historial")}
                >
                  Historial de compras
                </button>
              </div>

              {seccionInfoAbierta === "perfil" ? (
                <>
                  <div className="purchase-info-toolbar">
                    <button
                      type="button"
                      className="purchase-edit-button"
                      onClick={() => {
                        setPerfilMensaje(null);
                        setPerfilError(null);
                        setEditandoPerfil(true);
                      }}
                      disabled={editandoPerfil}
                    >
                      <span aria-hidden="true">✎</span>
                      Editar información
                    </button>
                  </div>

                  <div className="purchase-info-grid">
                    <label className="purchase-info-card">
                      <span>Nombre</span>
                      <input
                        disabled={!editandoPerfil}
                        value={perfilEditable.nombre}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, nombre: event.target.value }))}
                      />
                    </label>
                    <label className="purchase-info-card">
                      <span>Apellido paterno</span>
                      <input
                        disabled={!editandoPerfil}
                        value={perfilEditable.apellido_paterno}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, apellido_paterno: event.target.value }))}
                      />
                    </label>
                    <label className="purchase-info-card">
                      <span>Apellido materno</span>
                      <input
                        disabled={!editandoPerfil}
                        value={perfilEditable.apellido_materno}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, apellido_materno: event.target.value }))}
                      />
                    </label>
                    <label className="purchase-info-card">
                      <span>Teléfono</span>
                      <input
                        disabled={!editandoPerfil}
                        value={perfilEditable.telefono}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, telefono: event.target.value }))}
                      />
                    </label>
                    <label className="purchase-info-card">
                      <span>Correo</span>
                      <input
                        disabled={!editandoPerfil}
                        type="email"
                        value={perfilEditable.email}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, email: event.target.value }))}
                      />
                    </label>
                    <label className="purchase-info-card">
                      <span>Nueva contraseña</span>
                      <input
                        disabled={!editandoPerfil}
                        type="password"
                        placeholder="Déjala vacía si no cambia"
                        value={perfilEditable.contrasena}
                        onChange={(event) => setPerfilEditable((actual) => ({ ...actual, contrasena: event.target.value }))}
                      />
                    </label>
                    <article className="purchase-info-card">
                      <span>Estatus</span>
                      <strong>{usuario?.estatus ?? "Sin estatus"}</strong>
                    </article>
                    <article className="purchase-info-card">
                      <span>Tienda</span>
                      <strong>{usuario?.tienda?.nombre ?? "Sin tienda asignada"}</strong>
                    </article>
                    <article className="purchase-info-card purchase-info-card-wide">
                      <span>Dirección</span>
                      <strong>{direccionUsuario}</strong>
                    </article>
                  </div>

                  {perfilMensaje ? <p className="sales-feedback sales-feedback-success">{perfilMensaje}</p> : null}
                  {perfilError ? <p className="sales-feedback sales-feedback-error">{perfilError}</p> : null}

                  {editandoPerfil ? (
                    <div className="purchase-info-actions">
                      <button
                        type="button"
                        className="inventory-secondary-button"
                        onClick={() => {
                          setEditandoPerfil(false);
                          setPerfilMensaje(null);
                          setPerfilError(null);
                          restablecerPerfilEditable();
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="inventory-primary-button"
                        onClick={guardarPerfil}
                        disabled={guardandoPerfil}
                      >
                        {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {seccionInfoAbierta === "historial" ? (
                <>
                  {facturaError ? <p className="sales-feedback sales-feedback-error">{facturaError}</p> : null}
                  {historialLoading ? <p className="form-message">Cargando historial...</p> : null}
                  {historialError ? <p className="form-message">{historialError}</p> : null}

                  {!historialLoading && !historialError && historialData.compras.length === 0 ? (
                    <p className="purchase-history-empty">Aún no tienes compras registradas.</p>
                  ) : null}

                  <div className="purchase-history-list">
                    {historialData.compras.map((compra) => (
                      <article key={compra.id_venta} className="purchase-history-card">
                        <div className="purchase-history-card-top">
                          <div>
                            <p className="detail-eyebrow">{compra.folio}</p>
                            <h4>{formatCurrency(compra.total)}</h4>
                            <p>{formatDateTime(compra.fecha)}</p>
                          </div>
                          <div className="purchase-history-badges">
                            <span>{compra.estado}</span>
                            <span>{compra.metodo_pago}</span>
                            <span>{compra.articulos} artículo(s)</span>
                          </div>
                        </div>

                        <div className="purchase-history-meta">
                          <span>Tienda: {compra.tienda ?? "Asignada automáticamente"}</span>
                        </div>

                        <div className="purchase-history-actions">
                          <button
                            type="button"
                            className="inventory-secondary-button inventory-table-button"
                            onClick={() => descargarFactura(compra.id_venta)}
                            disabled={descargandoFacturaId === compra.id_venta}
                          >
                            {descargandoFacturaId === compra.id_venta ? "Descargando..." : "Descargar factura"}
                          </button>
                        </div>

                        <div className="purchase-history-items">
                          {compra.detalles.map((detalle) => (
                            <div key={`${compra.id_venta}-${detalle.producto_id}`} className="purchase-history-item">
                              {detalle.imagen_url && (
                                <img src={getAssetUrl(detalle.imagen_url)} alt={detalle.nombre} className="product-image" />
                              )}
                              <div>
                                <strong>{detalle.nombre}</strong>
                                <p>{detalle.cantidad} x {formatCurrency(detalle.precio_unitario)}</p>
                              </div>
                              <strong>{formatCurrency(detalle.subtotal)}</strong>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>

      <section className="stats-grid purchases-stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Artículos disponibles</span>
          </div>
          <h3>{productos.length}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>En carrito</span>
          </div>
          <h3>{carrito.reduce((total, item) => total + item.cantidad, 0)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Pago</span>
          </div>
          <h3>{metodoTransferencia?.nombre ?? "Transferencia"}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Total actual</span>
          </div>
          <h3>{formatCurrency(resumen.total)}</h3>
        </div>
      </section>

      <section className="sales-layout">
        <ProductCatalog
          busqueda={busqueda}
          tiendaSeleccionada="catalogo-global"
          productos={productosFiltrados}
          onBusquedaChange={setBusqueda}
          onSeleccionarProducto={agregarProducto}
          obtenerStockDisponible={obtenerStockDisponible}
        />

        {mostrarCheckout ? (
          <aside className="panel sales-cart">
            <div className="sales-cart-topbar">
              <h3>Tu carrito</h3>
              <button type="button" className="inventory-secondary-button" onClick={() => setMostrarCheckout(false)}>
                Seguir comprando
              </button>
            </div>

            <div className="sales-payment-block">
              <label htmlFor="metodo-compra">Método de pago</label>
              <input id="metodo-compra" value={metodoTransferencia?.nombre ?? "Transferencia"} readOnly />
            </div>

            <div className="sales-cart-header">
              <h4>Artículos seleccionados</h4>
            </div>

            <div className="sales-cart-items">
              {carrito.map((item) => (
                <div key={item.producto_id} className="sales-cart-item">
                  <div className="sales-cart-item-top">
                    <div>
                      <strong>{item.nombre}</strong>
                      <p>{item.sku} · {formatCurrency(item.precio_unitario)} c/u</p>
                    </div>
                    <button type="button" className="sales-remove-button" onClick={() => eliminarProducto(item.producto_id)}>
                      Eliminar
                    </button>
                  </div>

                  <div className="sales-cart-item-controls">
                    <div className="sales-quantity-box">
                      <button type="button" onClick={() => actualizarCantidad(item.producto_id, -1)}>-</button>
                      <span>{item.cantidad}</span>
                      <button type="button" onClick={() => actualizarCantidad(item.producto_id, 1)}>+</button>
                    </div>
                    <strong>{formatCurrency(item.precio_unitario * item.cantidad)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="sales-summary">
              <div>
                <span>Subtotal:</span>
                <strong>{formatCurrency(resumen.subtotal)}</strong>
              </div>
              <div>
                <span>IVA (10%):</span>
                <strong>{formatCurrency(resumen.iva)}</strong>
              </div>
              <div className="sales-total">
                <span>Total:</span>
                <strong>{formatCurrency(resumen.total)}</strong>
              </div>
            </div>

            {ventaError ? <p className="sales-feedback sales-feedback-error">{ventaError}</p> : null}
            {ventaSuccess ? <p className="sales-feedback sales-feedback-success">{ventaSuccess}</p> : null}

            <button type="button" className="sales-complete-button" onClick={completarCompra} disabled={guardandoCompra}>
              {guardandoCompra ? "Procesando..." : "Generar compra"}
            </button>
          </aside>
        ) : (
          <aside className="panel sales-cart sales-cart-placeholder">
            <div className="sales-placeholder-content">
              <h3>Selecciona tus productos</h3>
              <p>Haz clic en un artículo del catálogo para añadirlo al carrito y generar tu compra.</p>
            </div>
          </aside>
        )}
      </section>

      {loading ? <p className="panel">Cargando catálogo...</p> : null}
      {error ? <p className="panel">Error al cargar compras: {error}</p> : null}
    </Layout>
  );
}
