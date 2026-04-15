import { formatCurrency } from "../../lib/format";
import { getAssetUrl } from "../../lib/api";
import type { ProductoVenta } from "./types";

const hpImageUrl = "https://i.postimg.cc/W4hPK4y4/HP.png";
const samsungA54ImageUrl = "https://i.postimg.cc/kgjmfST3/A54.png";
const arielImageUrl = "https://i.postimg.cc/YCXHbFdL/Ariel.png";
const cocaColaImageUrl = "https://i.postimg.cc/fRHNBd8y/Coca_cola.png";
const cuadernoImageUrl = "https://i.postimg.cc/NjNcpXdj/Cuaderno.png";
const escritorioImageUrl = "https://i.postimg.cc/NjNcpXdf/Escritorio.png";
const jblImageUrl = "https://i.postimg.cc/L6WdPSXr/JBL.png";
const jumexImageUrl = "https://i.postimg.cc/Xvp0hvPX/Jumex.png";
const lechugaImageUrl = "https://i.postimg.cc/Xvp0hvPB/Lechuga.png";
const manzanaImageUrl = "https://i.postimg.cc/wB7dPBrm/Manzana.png";

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
  const resolveProductImage = (producto: ProductoVenta) => {
    if (producto.nombre === "Laptop HP Pavilion 15") {
      return hpImageUrl;
    }

    if (producto.nombre === "Smartphone Samsung Galaxy A54") {
      return samsungA54ImageUrl;
    }

    if (producto.nombre === "Detergente Ariel 1kg") {
      return arielImageUrl;
    }

    if (producto.nombre === "Coca Cola 2L") {
      return cocaColaImageUrl;
    }

    if (producto.nombre === "Cuaderno Profesional 100 hojas") {
      return cuadernoImageUrl;
    }

    if (producto.nombre === "Escritorio de Oficina") {
      return escritorioImageUrl;
    }

    if (producto.nombre === "Audífonos Bluetooth JBL") {
      return jblImageUrl;
    }

    if (producto.nombre === "Jugo Jumex Naranja 1L") {
      return jumexImageUrl;
    }

    if (producto.nombre === "Lechuga Romana") {
      return lechugaImageUrl;
    }

    if (producto.nombre === "Manzanas Red Delicious") {
      return manzanaImageUrl;
    }

    return getAssetUrl(producto.imagen);
  };

  const resolveImageStyle = (producto: ProductoVenta) => {
    if (producto.nombre === "Audífonos Bluetooth JBL") {
      return { objectPosition: "center 58%" } as const;
    }

    return undefined;
  };

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
              const imageUrl = resolveProductImage(producto);
              const imageStyle = resolveImageStyle(producto);
              const nombresTiendasConStock = producto.stock_por_tienda
                .filter((stock) => stock.stock > 0)
                .map((stock) => stock.tienda);

              return (
                <article
                  key={producto.id_producto}
                  className={`sales-product-card ${stockDisponible > 0 ? "sales-product-card-clickable" : "sales-product-card-disabled"}`}
                >
                  <div className="sales-product-image">
                    {imageUrl ? <img src={imageUrl} alt={producto.nombre} className="sales-product-image-tag" style={imageStyle} /> : "Imagen del producto"}
                  </div>
                  <div className="sales-product-meta">
                    <span className="sales-product-sku">{producto.sku ?? "Sin SKU"}</span>
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
