import { useEffect, useMemo, useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { getStoredUser } from "../lib/auth";
import { postApi } from "../lib/api";
import { ProductCatalog } from "../components/sales/ProductCatalog";
import { SaleCheckout } from "../components/sales/SaleCheckout";
import { SalesStoreStep } from "../components/sales/SalesStoreStep";
import { useSaleCheckout } from "../hooks/useSaleCheckout";
import type {
  ClienteVenta,
  MetodoPago,
  ProductoVenta,
  TiendaVenta,
} from "../components/sales/types";

export default function Ventas() {
  const [busqueda, setBusqueda] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("mostrador");
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const { data, loading, error } = useApiData(`/ventas?refresh=${reloadKey}`, {
    productos: [] as ProductoVenta[],
    catalogos: {
      clientes: [] as ClienteVenta[],
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
    setClienteSeleccionado(data.venta_en_curso.cliente_id ? String(data.venta_en_curso.cliente_id) : "mostrador");
    setMetodoPagoSeleccionado(
      data.venta_en_curso.id_metodo_pago
        ? String(data.venta_en_curso.id_metodo_pago)
        : (data.catalogos.metodos_pago[0]?.id_metodo_pago?.toString() ?? ""),
    );
    setTiendaSeleccionada((actual) => actual || data.venta_en_curso.id_tienda?.toString() || "");
    reiniciarVenta();
  }, [data]);

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
      producto.sku.toLowerCase().includes(query),
    );
  }, [busqueda, data.productos, productosOcultos]);

  const manejarCambioTienda = (value: string) => {
    setVentaError(null);
    setVentaSuccess(null);
    setTiendaSeleccionada(value);
    reiniciarVenta();
  };

  const completarVenta = async () => {
    const usuario = getStoredUser();

    if (!usuario?.id_usuario) {
      setVentaError("No fue posible identificar al usuario actual.");
      setVentaSuccess(null);
      return;
    }

    if (!tiendaSeleccionada) {
      setVentaError("Selecciona una tienda para registrar la venta.");
      setVentaSuccess(null);
      return;
    }

    if (!metodoPagoSeleccionado) {
      setVentaError("Selecciona un metodo de pago.");
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
        id_tienda: Number(tiendaSeleccionada),
        detalles: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      reiniciarVenta();
      setClienteSeleccionado("mostrador");
      setVentaSuccess("Venta registrada correctamente.");
      localStorage.setItem("sdgc_inventory_refresh", String(Date.now()));
      window.dispatchEvent(new CustomEvent("sdgc:inventory-refresh"));
      window.alert("Se completo la venta correctamente.");
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
          <p>Primero selecciona una tienda y despues elige productos para completar la venta.</p>
        </div>
      </section>

      <SalesStoreStep
        tiendaSeleccionada={tiendaSeleccionada}
        tiendas={data.catalogos.tiendas}
        onChange={manejarCambioTienda}
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
          clienteSeleccionado={clienteSeleccionado}
          metodoPagoSeleccionado={metodoPagoSeleccionado}
          tiendaSeleccionada={tiendaSeleccionada}
          clientes={data.catalogos.clientes}
          metodosPago={data.catalogos.metodos_pago}
          tiendas={data.catalogos.tiendas}
          resumen={resumen}
          ventaError={ventaError}
          ventaSuccess={ventaSuccess}
          guardandoVenta={guardandoVenta}
          onClienteChange={setClienteSeleccionado}
          onMetodoPagoChange={setMetodoPagoSeleccionado}
          onTiendaChange={manejarCambioTienda}
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
