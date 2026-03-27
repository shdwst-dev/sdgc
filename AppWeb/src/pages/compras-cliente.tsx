import { useMemo, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";
import { postApi } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { ProductCatalog } from "../components/sales/ProductCatalog";
import { useSaleCheckout } from "../hooks/useSaleCheckout";
import type { MetodoPago, ProductoVenta } from "../components/sales/types";

type ProductoInventario = {
  id_producto: number;
  sku: string;
  producto: string;
  precio: number;
  stock: number;
  stock_por_tienda: Array<{
    id_tienda: number;
    tienda: string;
    stock_actual: number;
    stock_minimo: number;
  }>;
};

export default function ComprasCliente() {
  const usuario = getStoredUser();
  const [busqueda, setBusqueda] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
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

  const productos = useMemo<ProductoVenta[]>(
    () => inventarioData.productos.map((producto) => ({
      id_producto: producto.id_producto,
      sku: producto.sku,
      nombre: producto.producto,
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
      producto.nombre.toLowerCase().includes(query) ||
      producto.sku.toLowerCase().includes(query),
    );
  }, [busqueda, productos, productosOcultos]);

  const completarCompra = async () => {
    if (!usuario?.id_usuario) {
      setVentaError("No fue posible identificar al comprador actual.");
      setVentaSuccess(null);
      return;
    }

    if (!metodoTransferencia) {
      setVentaError("No existe el metodo de pago Transferencia.");
      setVentaSuccess(null);
      return;
    }

    if (carrito.length === 0) {
      setVentaError("Agrega al menos un articulo al carrito.");
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

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Compras</h1>
          <p>Explora el catálogo, agrega artículos al carrito y genera tu compra con pago por transferencia.</p>
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
              <label htmlFor="metodo-compra">Metodo de pago</label>
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
