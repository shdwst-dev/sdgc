import { useState } from "react";
import Layout from "./layout";
import "../styles/dashboard.css";
import { useApiData } from "../hooks/useApiData";
import { formatCurrency } from "../lib/format";
import { deleteApi, postApi, putApi } from "../lib/api";

type ProductoInventario = {
  id_producto: number;
  sku: string;
  producto: string;
  categoria: string;
  stock: number;
  minimo: number;
  costo: number;
  precio: number;
  estatus: string;
  estado: string;
};

export default function Inventario() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);
  const [productoEditando, setProductoEditando] = useState<ProductoInventario | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionSuccess, setAccionSuccess] = useState<string | null>(null);
  const [productoEditable, setProductoEditable] = useState({
    nombre: "",
    codigo_barras: "",
    precio_base: "",
    precio_unitario: "",
    imagen_url: "",
    id_estatus: "1",
  });
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    codigo_barras: "",
    id_subcategoria: "",
    id_medida: "",
    id_unidad: "",
    precio_base: "",
    precio_unitario: "",
    imagen_url: "",
    id_estatus: "1",
  });
  const { data, loading, error } = useApiData(`/inventario?refresh=${reloadKey}`, {
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
    },
    productos: [] as ProductoInventario[],
  });

  const productosActivos = data.productos.filter((producto) => producto.estatus !== "Inactivo");

  const productosFiltrados = productosActivos.filter((producto) => {
    const coincideBusqueda =
      producto.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria =
      categoriaSeleccionada === "Todas" || producto.categoria === categoriaSeleccionada;
    const coincideEstado =
      estadoSeleccionado === "Todos" || producto.estado === estadoSeleccionado;

    return coincideBusqueda && coincideCategoria && coincideEstado;
  });

  const crearProducto = async () => {
    setGuardando(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await postApi("/v1/productos", {
        nombre: nuevoProducto.nombre,
        codigo_barras: nuevoProducto.codigo_barras || null,
        id_subcategoria: Number(nuevoProducto.id_subcategoria),
        id_medida: Number(nuevoProducto.id_medida),
        id_unidad: Number(nuevoProducto.id_unidad),
        precio_base: Number(nuevoProducto.precio_base),
        precio_unitario: Number(nuevoProducto.precio_unitario),
        imagen_url: nuevoProducto.imagen_url || null,
        id_estatus: Number(nuevoProducto.id_estatus),
      });

      setFormSuccess("Producto creado correctamente.");
      setNuevoProducto({
        nombre: "",
        codigo_barras: "",
        id_subcategoria: "",
        id_medida: "",
        id_unidad: "",
        precio_base: "",
        precio_unitario: "",
        imagen_url: "",
        id_estatus: "1",
      });
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No fue posible crear el producto.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirDetalle = (producto: ProductoInventario) => {
    setProductoSeleccionado(producto);
    setProductoEditando(null);
    setAccionError(null);
    setAccionSuccess(null);
  };

  const abrirEdicion = (producto: ProductoInventario) => {
    setProductoEditando(producto);
    setProductoSeleccionado(null);
    setAccionError(null);
    setAccionSuccess(null);
    setProductoEditable({
      nombre: producto.producto,
      codigo_barras: producto.sku,
      precio_base: String(producto.costo),
      precio_unitario: String(producto.precio),
      imagen_url: "",
      id_estatus: data.catalogos.estatus.find((estatus) => estatus.nombre === producto.estatus)?.id_estatus?.toString() ?? "1",
    });
  };

  const guardarEdicion = async () => {
    if (!productoEditando) {
      return;
    }

    setGuardandoEdicion(true);
    setAccionError(null);
    setAccionSuccess(null);

    try {
      await putApi(`/v1/productos/${productoEditando.id_producto}`, {
        nombre: productoEditable.nombre,
        codigo_barras: productoEditable.codigo_barras || null,
        precio_base: Number(productoEditable.precio_base),
        precio_unitario: Number(productoEditable.precio_unitario),
        imagen_url: productoEditable.imagen_url || null,
        id_estatus: Number(productoEditable.id_estatus),
      });

      setAccionSuccess("Producto actualizado correctamente.");
      setReloadKey((current) => current + 1);
      setProductoEditando(null);
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible actualizar el producto.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarProducto = async (producto: ProductoInventario) => {
    const confirmado = window.confirm(`¿Deseas eliminar ${producto.producto}?`);

    if (!confirmado) {
      return;
    }

    setAccionError(null);
    setAccionSuccess(null);

    try {
      await deleteApi(`/v1/productos/${producto.id_producto}`);
      setAccionSuccess("Producto eliminado correctamente.");
      setReloadKey((current) => current + 1);
      if (productoSeleccionado?.id_producto === producto.id_producto) {
        setProductoSeleccionado(null);
      }
      if (productoEditando?.id_producto === producto.id_producto) {
        setProductoEditando(null);
      }
    } catch (submitError) {
      setAccionError(submitError instanceof Error ? submitError.message : "No fue posible eliminar el producto.");
    }
  };

  return (
    <Layout>
      <header className="topbar">
        <div className="topbar-search">
          <input type="text" placeholder="Buscar en inventario..." />
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
          <h1>Catálogo de productos</h1>
          <p>Administra existencias, categorías y niveles mínimos desde un solo lugar.</p>
        </div>
        <button className="inventory-primary-button" type="button" onClick={() => setMostrarFormulario((valor) => !valor)}>
          {mostrarFormulario ? "Ocultar formulario" : "Nuevo producto"}
        </button>
      </section>

      {mostrarFormulario ? (
        <section className="panel form-panel">
          <div className="form-panel-header">
            <h3>Alta de producto</h3>
            <p>Registra un nuevo artículo usando los catálogos existentes del sistema.</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, nombre: e.target.value }))}
                placeholder="Nombre del producto"
              />
            </label>

            <label className="form-field">
              <span>SKU / Código de barras</span>
              <input
                value={nuevoProducto.codigo_barras}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, codigo_barras: e.target.value }))}
                placeholder="7501234567890"
              />
            </label>

            <label className="form-field">
              <span>Subcategoría</span>
              <select
                value={nuevoProducto.id_subcategoria}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, id_subcategoria: e.target.value }))}
              >
                <option value="">Selecciona una subcategoría</option>
                {data.catalogos.subcategorias.map((subcategoria) => (
                  <option key={subcategoria.id_subcategoria} value={subcategoria.id_subcategoria}>
                    {subcategoria.categoria} / {subcategoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Medida</span>
              <select
                value={nuevoProducto.id_medida}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, id_medida: e.target.value }))}
              >
                <option value="">Selecciona una medida</option>
                {data.catalogos.medidas.map((medida) => (
                  <option key={medida.id_medida} value={medida.id_medida}>
                    Medida #{medida.id_medida} ({medida.altura ?? 0} x {medida.ancho ?? 0})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Unidad</span>
              <select
                value={nuevoProducto.id_unidad}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, id_unidad: e.target.value }))}
              >
                <option value="">Selecciona una unidad</option>
                {data.catalogos.unidades.map((unidad) => (
                  <option key={unidad.id_unidad} value={unidad.id_unidad}>
                    {unidad.nombre} ({unidad.abreviatura})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Estatus</span>
              <select
                value={nuevoProducto.id_estatus}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, id_estatus: e.target.value }))}
              >
                {data.catalogos.estatus.map((estatus) => (
                  <option key={estatus.id_estatus} value={estatus.id_estatus}>
                    {estatus.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Costo base</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={nuevoProducto.precio_base}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, precio_base: e.target.value }))}
                placeholder="0.00"
              />
            </label>

            <label className="form-field">
              <span>Precio de venta</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={nuevoProducto.precio_unitario}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, precio_unitario: e.target.value }))}
                placeholder="0.00"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Imagen URL</span>
              <input
                value={nuevoProducto.imagen_url}
                onChange={(e) => setNuevoProducto((actual) => ({ ...actual, imagen_url: e.target.value }))}
                placeholder="https://..."
              />
            </label>
          </div>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}
          {formSuccess ? <p className="form-message form-message-success">{formSuccess}</p> : null}

          <div className="form-actions">
            <button className="inventory-primary-button" type="button" onClick={crearProducto} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title-row">
            <span>Productos activos</span>
            <span>📦</span>
          </div>
          <h3>{data.metricas.productos_activos}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Stock total</span>
            <span>≡</span>
          </div>
          <h3>{data.metricas.stock_total}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Alertas activas</span>
            <span>!</span>
          </div>
          <h3>{data.metricas.alertas_activas}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-title-row">
            <span>Valor del inventario</span>
            <span>$</span>
          </div>
          <h3>{formatCurrency(data.metricas.valor_inventario)}</h3>
        </div>
      </section>

      <section className="panel inventory-panel">
        {accionError ? <p className="form-message form-message-error">{accionError}</p> : null}
        {accionSuccess ? <p className="form-message form-message-success">{accionSuccess}</p> : null}

        {productoSeleccionado ? (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Detalle del producto</h3>
              <button type="button" className="inventory-secondary-button" onClick={() => setProductoSeleccionado(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-hero">
              <div>
                <p className="detail-eyebrow">Producto</p>
                <h4>{productoSeleccionado.producto}</h4>
                <p className="detail-subtitle">SKU {productoSeleccionado.sku}</p>
              </div>
              <span className="inventory-status inventory-status-ok">{productoSeleccionado.estatus}</span>
            </div>
            <div className="detail-summary-grid">
              <div className="detail-summary-card">
                <span>Existencia</span>
                <strong>{productoSeleccionado.stock}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Mínimo</span>
                <strong>{productoSeleccionado.minimo}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Costo</span>
                <strong>{formatCurrency(productoSeleccionado.costo)}</strong>
              </div>
              <div className="detail-summary-card">
                <span>Precio</span>
                <strong>{formatCurrency(productoSeleccionado.precio)}</strong>
              </div>
            </div>
            <div className="detail-card-grid">
              <div className="detail-field"><span>Categoría</span><strong>{productoSeleccionado.categoria}</strong></div>
              <div className="detail-field"><span>Estado de inventario</span><strong>{productoSeleccionado.estado}</strong></div>
            </div>
          </div>
        ) : null}

        {productoEditando ? (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Editar producto</h3>
              <button type="button" className="inventory-secondary-button" onClick={() => setProductoEditando(null)}>
                Cancelar
              </button>
            </div>
            <div className="detail-edit-layout">
              <div className="detail-edit-sidebar">
                <p className="detail-eyebrow">Campos editables</p>
                <h4>{productoEditando.producto}</h4>
                <p className="detail-subtitle">Actualiza datos comerciales y el estatus del producto.</p>
                <div className="detail-field-list">
                  <div className="detail-field"><span>Categoría</span><strong>{productoEditando.categoria}</strong></div>
                  <div className="detail-field"><span>Existencia actual</span><strong>{productoEditando.stock}</strong></div>
                  <div className="detail-field"><span>Estado actual</span><strong>{productoEditando.estado}</strong></div>
                </div>
              </div>
              <div className="detail-edit-main">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Nombre</span>
                    <input value={productoEditable.nombre} onChange={(e) => setProductoEditable((actual) => ({ ...actual, nombre: e.target.value }))} />
                  </label>
                  <label className="form-field">
                    <span>SKU</span>
                    <input value={productoEditable.codigo_barras} onChange={(e) => setProductoEditable((actual) => ({ ...actual, codigo_barras: e.target.value }))} />
                  </label>
                  <label className="form-field">
                    <span>Estatus</span>
                    <select value={productoEditable.id_estatus} onChange={(e) => setProductoEditable((actual) => ({ ...actual, id_estatus: e.target.value }))}>
                      {data.catalogos.estatus.map((estatus) => (
                        <option key={estatus.id_estatus} value={estatus.id_estatus}>
                          {estatus.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Costo base</span>
                    <input type="number" min="0.01" step="0.01" value={productoEditable.precio_base} onChange={(e) => setProductoEditable((actual) => ({ ...actual, precio_base: e.target.value }))} />
                  </label>
                  <label className="form-field">
                    <span>Precio de venta</span>
                    <input type="number" min="0.01" step="0.01" value={productoEditable.precio_unitario} onChange={(e) => setProductoEditable((actual) => ({ ...actual, precio_unitario: e.target.value }))} />
                  </label>
                  <label className="form-field form-field-full">
                    <span>Imagen URL</span>
                    <input value={productoEditable.imagen_url} onChange={(e) => setProductoEditable((actual) => ({ ...actual, imagen_url: e.target.value }))} />
                  </label>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="inventory-primary-button" type="button" onClick={guardarEdicion} disabled={guardandoEdicion}>
                {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="inventory-filters">
          <input type="text" placeholder="Buscar productos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
            <option value="Todas">Todas las categorías</option>
            {productosActivos
              .map((producto) => producto.categoria)
              .filter((categoria, index, categorias) => categorias.indexOf(categoria) === index)
              .map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
          </select>
          <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Stock bajo">Stock bajo</option>
            <option value="Sin stock">Sin stock</option>
          </select>
          <button type="button" className="inventory-secondary-button">
            {productosFiltrados.length} resultados
          </button>
        </div>

        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Existencia</th>
                <th>Mínimo</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => (
                <tr key={producto.id_producto}>
                  <td>{producto.sku}</td>
                  <td>{producto.producto}</td>
                  <td>{producto.categoria}</td>
                  <td>{producto.stock}</td>
                  <td>{producto.minimo}</td>
                  <td>{formatCurrency(producto.costo)}</td>
                  <td>{formatCurrency(producto.precio)}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        producto.estado === "Stock bajo"
                          ? "inventory-status-low"
                          : producto.estado === "Sin stock"
                            ? "invoice-status-overdue"
                            : "inventory-status-ok"
                      }`}
                    >
                      {producto.estado}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button type="button" className="customer-action-button customer-action-button-view" onClick={() => abrirDetalle(producto)}>
                        Ver
                      </button>
                      <button type="button" className="customer-action-button customer-action-button-edit" onClick={() => abrirEdicion(producto)}>
                        Editar
                      </button>
                      <button type="button" className="customer-action-button customer-action-button-delete" onClick={() => eliminarProducto(producto)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="panel">Cargando inventario...</p> : null}
      {error ? <p className="panel">Error al cargar inventario: {error}</p> : null}
    </Layout>
  );
}
