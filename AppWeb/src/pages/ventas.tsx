import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";

export default function Ventas() {
  const { data, loading, error } = useApiData("/ventas", {
    productos: [] as Array<{ sku: string; nombre: string; precio: number; stock: number }>,
    metodos_pago: [] as string[],
    venta_en_curso: {
      cliente: "",
      metodo_pago: "Efectivo",
      carrito: [] as Array<{
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

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en ventas..." />
        </div>

        <div className="topbar-actions">
          <button className="icon-button" type="button">🔔</button>
          <select className="user-select" defaultValue={localStorage.getItem("rolUsuario") || "Administrador"}>
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Comprador</option>
          </select>
        </div>
      </header>

      <section className="inventory-header">
        <div>
          <h1>Ventas / Punto de venta</h1>
          <p>Agrega productos al carrito, selecciona cliente y finaliza la venta desde una sola pantalla.</p>
        </div>
      </section>

      <section className="sales-layout">
        <div className="sales-catalog">
          <div className="panel inventory-panel">
            <div className="sales-search">
              <input type="text" placeholder="Buscar productos por nombre o SKU..." />
            </div>

            <div className="sales-products-grid">
              {data.productos.map((producto) => (
                <article key={producto.sku} className="sales-product-card">
                  <div className="sales-product-image">Imagen del producto</div>
                  <div className="sales-product-meta">
                    <span className="sales-product-sku">{producto.sku}</span>
                    <h4>{producto.nombre}</h4>
                    <div className="sales-product-row">
                      <strong>{formatCurrency(producto.precio)}</strong>
                      <span>Stock: {producto.stock}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="panel sales-cart">
          <div className="sales-customer-block">
            <label htmlFor="cliente">Cliente</label>
            <div className="sales-customer-row">
              <input id="cliente" type="text" placeholder="Seleccionar cliente..." value={data.venta_en_curso.cliente} readOnly />
              <button type="button" className="sales-add-button">+</button>
            </div>
          </div>

          <div className="sales-cart-header">
            <h4>Artículos del carrito</h4>
          </div>

          <div className="sales-cart-items">
            {data.venta_en_curso.carrito.map((item) => (
              <div key={item.nombre} className="sales-cart-item">
                <div className="sales-cart-item-top">
                  <div>
                    <strong>{item.nombre}</strong>
                    <p>{formatCurrency(item.precio_unitario)} c/u</p>
                  </div>
                  <button type="button" className="sales-remove-button">
                    Eliminar
                  </button>
                </div>

                <div className="sales-cart-item-controls">
                  <div className="sales-quantity-box">
                    <button type="button">-</button>
                    <span>{item.cantidad}</span>
                    <button type="button">+</button>
                  </div>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>

                {item.descuento ? <span className="sales-discount">Descuento: {item.descuento}</span> : null}
              </div>
            ))}
          </div>

          <div className="sales-summary">
            <div>
              <span>Subtotal:</span>
              <strong>{formatCurrency(data.venta_en_curso.resumen.subtotal)}</strong>
            </div>
            <div>
              <span>IVA (10%):</span>
              <strong>{formatCurrency(data.venta_en_curso.resumen.iva)}</strong>
            </div>
            <div className="sales-total">
              <span>Total:</span>
              <strong>{formatCurrency(data.venta_en_curso.resumen.total)}</strong>
            </div>
          </div>

          <div className="sales-payment-block">
            <label htmlFor="metodo-pago">Método de pago</label>
            <select id="metodo-pago" value={data.venta_en_curso.metodo_pago} disabled onChange={() => undefined}>
              {data.metodos_pago.map((metodo) => (
                <option key={metodo}>{metodo}</option>
              ))}
            </select>
          </div>

          <button type="button" className="sales-complete-button">
            Completar venta
          </button>
        </aside>
      </section>

      {loading ? <p className="panel">Cargando punto de venta...</p> : null}
      {error ? <p className="panel">Error al cargar ventas: {error}</p> : null}
    </Layout>
  );
}
