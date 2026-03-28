import { formatCurrency } from "../../lib/format";
import type { CarritoItem, MetodoPago, TiendaVenta } from "./types";

type SaleCheckoutProps = {
  mostrarCheckout: boolean;
  carrito: CarritoItem[];
  metodoPagoSeleccionado: string;
  tiendaSeleccionada: string;
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
  onMetodoPagoChange: (value: string) => void;
  onActualizarCantidad: (productoId: number, delta: number) => void;
  onEliminarProducto: (productoId: number) => void;
  onCompletarVenta: () => void;
  onOcultarCheckout: () => void;
};

export function SaleCheckout({
  mostrarCheckout,
  carrito,
  metodoPagoSeleccionado,
  tiendaSeleccionada,
  metodosPago,
  tiendas,
  resumen,
  ventaError,
  ventaSuccess,
  guardandoVenta,
  onMetodoPagoChange,
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
        <div className="sales-static-field" id="cliente">
          <strong>Venta mostrador</strong>
        </div>
      </div>

      <div className="sales-payment-block">
        <label htmlFor="tienda-venta">Tienda</label>
        <div className="sales-static-field" id="tienda-venta">
          <strong>{tiendas.find((tienda) => String(tienda.id_tienda) === tiendaSeleccionada)?.nombre ?? "Sin tienda asignada"}</strong>
        </div>
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
