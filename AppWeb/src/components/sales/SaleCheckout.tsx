import { formatCurrency } from "../../lib/format";
import type { CarritoItem, ClienteVenta, MetodoPago, TiendaVenta } from "./types";

type SaleCheckoutProps = {
  mostrarCheckout: boolean;
  carrito: CarritoItem[];
  clienteSeleccionado: string;
  metodoPagoSeleccionado: string;
  tiendaSeleccionada: string;
  clientes: ClienteVenta[];
  metodosPago: MetodoPago[];
  tiendas: TiendaVenta[];
  resumen: {
    subtotal: number;
    iva: number;
    total: number;
  };
  ventaError: string | null;
  ventaSuccess: string | null;
  guardandoVenta: boolean;
  onClienteChange: (value: string) => void;
  onMetodoPagoChange: (value: string) => void;
  onTiendaChange: (value: string) => void;
  onActualizarCantidad: (productoId: number, delta: number) => void;
  onEliminarProducto: (productoId: number) => void;
  onCompletarVenta: () => void;
  onOcultarCheckout: () => void;
};

export function SaleCheckout({
  mostrarCheckout,
  carrito,
  clienteSeleccionado,
  metodoPagoSeleccionado,
  tiendaSeleccionada,
  clientes,
  metodosPago,
  tiendas,
  resumen,
  ventaError,
  ventaSuccess,
  guardandoVenta,
  onClienteChange,
  onMetodoPagoChange,
  onTiendaChange,
  onActualizarCantidad,
  onEliminarProducto,
  onCompletarVenta,
  onOcultarCheckout,
}: SaleCheckoutProps) {
  if (!mostrarCheckout) {
    return (
      <aside className="panel sales-cart sales-cart-placeholder">
        <div className="sales-placeholder-content">
          <h3>Selecciona un producto</h3>
          <p>Cuando des clic en uno del catalogo, aqui aparecera todo lo necesario para completar la venta.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel sales-cart">
      <div className="sales-cart-topbar">
        <h3>Completar venta</h3>
        <button type="button" className="inventory-secondary-button" onClick={onOcultarCheckout}>
          Ver mas productos
        </button>
      </div>

      <div className="sales-customer-block">
        <label htmlFor="cliente">Cliente / referencia</label>
        <select id="cliente" value={clienteSeleccionado} onChange={(e) => onClienteChange(e.target.value)}>
          <option value="mostrador">Venta mostrador</option>
          {clientes.map((cliente) => (
            <option key={cliente.id_usuario} value={cliente.id_usuario}>
              {cliente.nombre} ({cliente.email})
            </option>
          ))}
        </select>
      </div>

      <div className="sales-payment-block">
        <label htmlFor="tienda-venta">Tienda</label>
        <select id="tienda-venta" value={tiendaSeleccionada} onChange={(e) => onTiendaChange(e.target.value)}>
          <option value="">Selecciona una tienda</option>
          {tiendas.map((tienda) => (
            <option key={tienda.id_tienda} value={tienda.id_tienda}>
              {tienda.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="sales-cart-header">
        <h4>Articulos seleccionados</h4>
      </div>

      <div className="sales-cart-items">
        {carrito.length === 0 ? <p className="sales-empty-state">Selecciona un producto para iniciar la venta.</p> : null}
        {carrito.map((item) => (
          <div key={item.producto_id} className="sales-cart-item">
            <div className="sales-cart-item-top">
              <div>
                <strong>{item.nombre}</strong>
                <p>{item.sku} · {formatCurrency(item.precio_unitario)} c/u</p>
              </div>
              <button type="button" className="sales-remove-button" onClick={() => onEliminarProducto(item.producto_id)}>
                Eliminar
              </button>
            </div>

            <div className="sales-cart-item-controls">
              <div className="sales-quantity-box">
                <button type="button" onClick={() => onActualizarCantidad(item.producto_id, -1)}>-</button>
                <span>{item.cantidad}</span>
                <button type="button" onClick={() => onActualizarCantidad(item.producto_id, 1)}>+</button>
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

      <div className="sales-payment-block">
        <label htmlFor="metodo-pago">Metodo de pago</label>
        <select id="metodo-pago" value={metodoPagoSeleccionado} onChange={(e) => onMetodoPagoChange(e.target.value)}>
          <option value="">Selecciona un metodo</option>
          {metodosPago.map((metodo) => (
            <option key={metodo.id_metodo_pago} value={metodo.id_metodo_pago}>
              {metodo.nombre}
            </option>
          ))}
        </select>
      </div>

      {ventaError ? <p className="sales-feedback sales-feedback-error">{ventaError}</p> : null}
      {ventaSuccess ? <p className="sales-feedback sales-feedback-success">{ventaSuccess}</p> : null}

      <button type="button" className="sales-complete-button" onClick={onCompletarVenta} disabled={guardandoVenta}>
        {guardandoVenta ? "Registrando..." : "Completar venta"}
      </button>
    </aside>
  );
}
