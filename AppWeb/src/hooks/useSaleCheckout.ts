import { useMemo, useState } from "react";
import type { CarritoItem, ProductoVenta } from "../components/sales/types";

type UseSaleCheckoutOptions = {
  productos: ProductoVenta[];
  tiendaSeleccionada: string;
  requireStoreSelection?: boolean;
};

export function useSaleCheckout({
  productos,
  tiendaSeleccionada,
  requireStoreSelection = true,
}: UseSaleCheckoutOptions) {
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [ventaError, setVentaError] = useState<string | null>(null);
  const [ventaSuccess, setVentaSuccess] = useState<string | null>(null);

  const obtenerStockDisponible = (productoId: number) => {
    const producto = productos.find((item) => item.id_producto === productoId);

    if (!producto) {
      return 0;
    }

    if (!tiendaSeleccionada) {
      return producto.stock;
    }

    return producto.stock_por_tienda.find((stock) => stock.id_tienda === Number(tiendaSeleccionada))?.stock ?? 0;
  };

  const productosOcultos = useMemo(
    () => new Set(carrito.map((item) => item.producto_id)),
    [carrito],
  );

  const resumen = useMemo(() => {
    const subtotal = carrito.reduce((total, item) => total + item.precio_unitario * item.cantidad, 0);
    const iva = Number((subtotal * 0.1).toFixed(2));

    return {
      subtotal,
      iva,
      total: subtotal + iva,
    };
  }, [carrito]);

  const limpiarMensajes = () => {
    setVentaError(null);
    setVentaSuccess(null);
  };

  const agregarProducto = (producto: ProductoVenta) => {
    if (requireStoreSelection && !tiendaSeleccionada) {
      setVentaError("Selecciona una tienda antes de iniciar la venta.");
      setVentaSuccess(null);
      return;
    }

    const stockDisponible = obtenerStockDisponible(producto.id_producto);

    if (stockDisponible <= 0) {
      setVentaError("Ese producto no tiene stock disponible.");
      setVentaSuccess(null);
      return;
    }

    limpiarMensajes();
    setMostrarCheckout(true);
    setCarrito((actual) => {
      const existente = actual.find((item) => item.producto_id === producto.id_producto);

      if (existente) {
        if (existente.cantidad >= stockDisponible) {
          setVentaError(`No hay más stock disponible para ${producto.nombre}.`);
          return actual;
        }

        return actual.map((item) =>
          item.producto_id === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }

      return [
        ...actual,
        {
          producto_id: producto.id_producto,
          sku: producto.sku ?? "",
          nombre: producto.nombre,
          precio_unitario: producto.precio,
          cantidad: 1,
        },
      ];
    });
  };

  const actualizarCantidad = (productoId: number, delta: number) => {
    limpiarMensajes();
    setCarrito((actual) =>
      actual.flatMap((item) => {
        if (item.producto_id !== productoId) {
          return [item];
        }

        const nuevoValor = item.cantidad + delta;
        const stockDisponible = obtenerStockDisponible(productoId);

        if (nuevoValor <= 0) {
          return [];
        }

        if (nuevoValor > stockDisponible) {
          setVentaError(`Solo hay ${stockDisponible} unidades disponibles para ${item.nombre}.`);
          return [item];
        }

        return [{ ...item, cantidad: nuevoValor }];
      }),
    );
  };

  const eliminarProducto = (productoId: number) => {
    limpiarMensajes();
    setCarrito((actual) => {
      const actualizado = actual.filter((item) => item.producto_id !== productoId);

      if (actualizado.length === 0) {
        setMostrarCheckout(false);
      }

      return actualizado;
    });
  };

  const reiniciarVenta = () => {
    setMostrarCheckout(false);
    setCarrito([]);
    limpiarMensajes();
  };

  return {
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
  };
}
