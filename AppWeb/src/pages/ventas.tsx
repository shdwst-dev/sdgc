import Layout from "./layout";
import "../styles/dashboard.css";

export default function Ventas() {
  const productos = [
    { sku: "SKU-001", nombre: "Producto A", precio: "$15.00", stock: 50 },
    { sku: "SKU-002", nombre: "Producto B", precio: "$30.00", stock: 20 },
    { sku: "SKU-003", nombre: "Producto C", precio: "$8.00", stock: 100 },
    { sku: "SKU-004", nombre: "Producto D", precio: "$45.00", stock: 15 },
  ];

  const carrito = [
    { nombre: "Producto A", precioUnitario: "$15.00", cantidad: 2, total: "$30.00" },
    { nombre: "Producto B", precioUnitario: "$30.00", cantidad: 1, total: "$25.00", descuento: "-$5.00" },
  ];

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
              {productos.map((producto) => (
                <article key={producto.sku} className="sales-product-card">
                  <div className="sales-product-image">Imagen del producto</div>
                  <div className="sales-product-meta">
                    <span className="sales-product-sku">{producto.sku}</span>
                    <h4>{producto.nombre}</h4>
                    <div className="sales-product-row">
                      <strong>{producto.precio}</strong>
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
              <input id="cliente" type="text" placeholder="Seleccionar cliente..." />
              <button type="button" className="sales-add-button">+</button>
            </div>
          </div>

          <div className="sales-cart-header">
            <h4>Artículos del carrito</h4>
          </div>

          <div className="sales-cart-items">
            {carrito.map((item) => (
              <div key={item.nombre} className="sales-cart-item">
                <div className="sales-cart-item-top">
                  <div>
                    <strong>{item.nombre}</strong>
                    <p>{item.precioUnitario} c/u</p>
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
                  <strong>{item.total}</strong>
                </div>

                {item.descuento ? <span className="sales-discount">Descuento: {item.descuento}</span> : null}
              </div>
            ))}
          </div>

          <div className="sales-summary">
            <div>
              <span>Subtotal:</span>
              <strong>$55.00</strong>
            </div>
            <div>
              <span>IVA (10%):</span>
              <strong>$5.50</strong>
            </div>
            <div className="sales-total">
              <span>Total:</span>
              <strong>$60.50</strong>
            </div>
          </div>

          <div className="sales-payment-block">
            <label htmlFor="metodo-pago">Método de pago</label>
            <select id="metodo-pago" defaultValue="Efectivo">
              <option>Efectivo</option>
              <option>Tarjeta</option>
              <option>Transferencia</option>
            </select>
          </div>

          <button type="button" className="sales-complete-button">
            Completar venta
          </button>
        </aside>
      </section>
    </Layout>
  );
}
