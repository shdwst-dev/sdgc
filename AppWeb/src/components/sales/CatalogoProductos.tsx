import { formatCurrency } from "../../lib/format";
import type { ProductoVenta } from "./types";

type ProductCatalogProps = {
  busqueda: string;
  tiendaSeleccionada: string;
  productos: ProductoVenta[];
  onBusquedaChange: (value: string) => void;
  onSeleccionarProducto: (producto: ProductoVenta) => void;
  obtenerStockDisponible: (productoId: number) => number;
};

export function ProductCatalog({
  busqueda,
  tiendaSeleccionada,
  productos,
  onBusquedaChange,
  onSeleccionarProducto,
  obtenerStockDisponible,
}: ProductCatalogProps) {
  return (
    <div className="sales-catalog">
      <div className="panel inventory-panel">
        <div className="sales-search">
          <input
            type="text"
            placeholder="Buscar productos por nombre o SKU..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </div>

        {tiendaSeleccionada ? (
          <div className="sales-products-grid">
            {productos.map((producto) => {
              const stockDisponible = obtenerStockDisponible(producto.id_producto);
              const nombresTiendasConStock = producto.stock_por_tienda
                .filter((stock) => stock.stock > 0)
                .map((stock) => stock.tienda);

              return (
                <article
                  key={producto.sku}
                  className={`sales-product-card ${stockDisponible > 0 ? "sales-product-card-clickable" : "sales-product-card-disabled"}`}
                >
                  <div className="sales-product-image">
                    {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} className="sales-product-image-tag" /> : "Imagen del producto"}
                  </div>
                  <div className="sales-product-meta">
                    <span className="sales-product-sku">{producto.sku}</span>
                    <h4>{producto.nombre}</h4>
                    <div className="sales-product-row">
                      <strong>{formatCurrency(producto.precio)}</strong>
                      <span>Stock: {stockDisponible}</span>
                    </div>
                    {stockDisponible <= 0 && nombresTiendasConStock.length > 0 ? (
                      <p className="sales-product-availability">
                        Disponible en: {nombresTiendasConStock.join(", ")}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="inventory-primary-button sales-product-button"
                      onClick={() => onSeleccionarProducto(producto)}
                      disabled={stockDisponible <= 0}
                    >
                      {stockDisponible > 0 ? "Seleccionar producto" : "Sin stock"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sales-empty-state">
            Selecciona una tienda para habilitar el catalogo de productos.
          </div>
        )}
      </div>
    </div>
  );
}
