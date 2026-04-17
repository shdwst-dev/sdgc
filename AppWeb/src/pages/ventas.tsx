import { useEffect, useMemo, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { getStoredUser } from "../lib/auth";
import { postApi } from "../lib/api";
import { ProductCatalog } from "../components/sales/CatalogoProductos";
import { SaleCheckout } from "../components/sales/CheckoutVentas";
import { SalesStoreStep } from "../components/sales/BypassVentas";
import { useSaleCheckout } from "../hooks/useSaleCheckout";
import type {
  MetodoPago,
  ProductoVenta,
  TiendaVenta,
} from "../components/sales/types";

function getAssignedStoreId(user: ReturnType<typeof getStoredUser>): string {
  const tienda = user?.tienda;

  if (!tienda || typeof tienda !== "object" || !("id_tienda" in tienda)) {
    return "";
  }

  return String(tienda.id_tienda);
}

export default function Ventas() {
  const usuario = getStoredUser();
  const tiendaUsuarioId = getAssignedStoreId(usuario);
  const [busqueda, setBusqueda] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const { data, loading, error } = useApiData(`/ventas?refresh=${reloadKey}`, {
    productos: [] as ProductoVenta[],
    catalogos: {
      metodos_pago: [] as MetodoPago[],
      tiendas: [] as TiendaVenta[],
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

  const tiendasDisponibles = useMemo(
    () => (tiendaUsuarioId
      ? data.catalogos.tiendas.filter((tienda) => String(tienda.id_tienda) === tiendaUsuarioId)
      : data.catalogos.tiendas),
    [data.catalogos.tiendas, tiendaUsuarioId],
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
    productos: data.productos,
    tiendaSeleccionada,
  });

  useEffect(() => {
    setMetodoPagoSeleccionado(
      data.venta_en_curso.id_metodo_pago
        ? String(data.venta_en_curso.id_metodo_pago)
        : (data.catalogos.metodos_pago[0]?.id_metodo_pago?.toString() ?? ""),
    );
    setTiendaSeleccionada((actual) => actual || tiendaUsuarioId || data.venta_en_curso.id_tienda?.toString() || "");
    reiniciarVenta();
  }, [data, tiendaUsuarioId, reiniciarVenta]);

  const productosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    const productosDisponibles = data.productos.filter(
      (producto) => !productosOcultos.has(producto.id_producto),
    );

    if (!query) {
      return productosDisponibles;
    }

    return productosDisponibles.filter((producto) =>
      producto.nombre.toLowerCase().includes(query) ||
      (producto.sku ?? "").toLowerCase().includes(query),
    );
  }, [busqueda, data.productos, productosOcultos]);

  const completarVenta = async () => {
    if (!usuario?.id_usuario) {
      setVentaError("No fue posible identificar al usuario actual.");
      setVentaSuccess(null);
      return;
    }

    if (!metodoPagoSeleccionado) {
      setVentaError("Selecciona un método de pago.");
      setVentaSuccess(null);
      return;
    }

    if (carrito.length === 0) {
      setVentaError("Agrega al menos un producto al carrito.");
      setVentaSuccess(null);
      return;
    }

    setGuardandoVenta(true);
    setVentaError(null);
    setVentaSuccess(null);

    try {
      await postApi("/v1/ventas/registrar", {
        id_usuario: usuario.id_usuario,
        id_metodo_pago: Number(metodoPagoSeleccionado),
        detalles: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      reiniciarVenta();
      setVentaSuccess("Venta registrada correctamente.");
      localStorage.setItem("sdgc_inventory_refresh", String(Date.now()));
      window.dispatchEvent(new CustomEvent("sdgc:inventory-refresh"));
      window.alert("Se completó la venta correctamente.");
      setReloadKey((actual) => actual + 1);
    } catch (submitError) {
      setVentaError(submitError instanceof Error ? submitError.message : "No fue posible registrar la venta.");
    } finally {
      setGuardandoVenta(false);
    }
  };

  return (
    <Layout>
      <section className="inventory-header">
        <div>
          <h1>Ventas / Punto de venta</h1>
          <p>Los productos y el stock se muestran segun la tienda asignada a tu usuario.</p>
        </div>
      </section>

      <SalesStoreStep
        tiendaSeleccionada={tiendaSeleccionada}
        tiendas={tiendasDisponibles}
      />

      <section className="sales-layout">
        <ProductCatalog
          busqueda={busqueda}
          tiendaSeleccionada={tiendaSeleccionada}
          productos={productosFiltrados}
          onBusquedaChange={setBusqueda}
          onSeleccionarProducto={agregarProducto}
          obtenerStockDisponible={obtenerStockDisponible}
        />

        <SaleCheckout
          mostrarCheckout={mostrarCheckout}
          carrito={carrito}
          metodoPagoSeleccionado={metodoPagoSeleccionado}
          tiendaSeleccionada={tiendaSeleccionada}
          metodosPago={data.catalogos.metodos_pago}
          tiendas={tiendasDisponibles}
          resumen={resumen}
          ventaError={ventaError}
          ventaSuccess={ventaSuccess}
          guardandoVenta={guardandoVenta}
          onMetodoPagoChange={setMetodoPagoSeleccionado}
          onActualizarCantidad={actualizarCantidad}
          onEliminarProducto={eliminarProducto}
          onCompletarVenta={completarVenta}
          onOcultarCheckout={() => setMostrarCheckout(false)}
        />
      </section>

      {loading ? <p className="panel">Cargando punto de venta...</p> : null}
      {error ? <p className="panel">Error al cargar ventas: {error}</p> : null}
    </Layout>
  );
}
