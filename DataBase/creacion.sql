-- Tablas de direcciones --

-- Tabla Países
CREATE TABLE paises
(
    id_pais SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL
);

-- Tabla Estados
CREATE TABLE estados
(
    id_estado SERIAL PRIMARY KEY,
    id_pais   INTEGER      NOT NULL,
    nombre    VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_pais) REFERENCES paises (id_pais)
);

-- Tabla Municipios
CREATE TABLE municipios
(
    id_municipio SERIAL PRIMARY KEY,
    id_estado    INTEGER      NOT NULL,
    nombre       VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_estado) REFERENCES estados (id_estado)
);

-- Tabla Colonias
CREATE TABLE colonias
(
    id_colonia   SERIAL PRIMARY KEY,
    id_municipio INTEGER      NOT NULL,
    nombre       VARCHAR(100) NOT NULL,
    cp           INTEGER,
    FOREIGN KEY (id_municipio) REFERENCES municipios (id_municipio)
);

-- Tabla Calles
CREATE TABLE calles
(
    id_calle   SERIAL PRIMARY KEY,
    id_colonia INTEGER      NOT NULL,
    nombre     VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_colonia) REFERENCES colonias (id_colonia)
);

-- Tabla Direcciones
CREATE TABLE direcciones
(
    id_direccion SERIAL PRIMARY KEY,
    id_calle     INTEGER NOT NULL,
    num_int      INTEGER,
    num_ext      INTEGER NOT NULL,
    FOREIGN KEY (id_calle) REFERENCES calles (id_calle)
);

-- Tablas de direcciones --

-- Tablas que se deben de tener primero --

-- Tabla Roles
CREATE TABLE roles
(
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Tabla Estatus
CREATE TABLE estatus
(
    id_estatus SERIAL PRIMARY KEY,
    nombre     VARCHAR(50) NOT NULL
);

-- Tabla Metodos_Pago
CREATE TABLE metodos_pago
(
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre         VARCHAR(50) NOT NULL
);

-- Tabla Unidades_medida
CREATE TABLE unidades_medida
(
    id_unidad   SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL,
    abreviatura VARCHAR(10) NOT NULL
);

-- Tabla Tipo_descuento
CREATE TABLE tipo_descuento
(
    id_tipo_descuento SERIAL PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL
);

-- Tabla Categorias
CREATE TABLE categorias
(
    id_categoria SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL
);

-- Tabla Medidas
CREATE TABLE medidas
(
    id_medida SERIAL PRIMARY KEY,
    altura    DECIMAL(10, 2),
    ancho     DECIMAL(10, 2),
    peso      DECIMAL(10, 2),
    volumen   DECIMAL(10, 2)
);

-- Tablas que se deben de tener primero --

-- Tablas de los usuarios --

-- Tabla Personas
CREATE TABLE personas
(
    id_persona       SERIAL PRIMARY KEY,
    nombre           VARCHAR(100),
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    telefono         VARCHAR(20),
    id_direccion     INTEGER NOT NULL,
    FOREIGN KEY (id_direccion) REFERENCES direcciones (id_direccion)
);

-- Tabla Usuarios
CREATE TABLE usuarios
(
    id_usuario SERIAL PRIMARY KEY,
    id_persona INTEGER      NOT NULL UNIQUE,
    email      VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_rol     INTEGER      NOT NULL,
    id_estatus INTEGER      NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona),
    FOREIGN KEY (id_rol) REFERENCES roles (id_rol),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus)
);

-- Tablas de los usuarios --

-- Tablas de las tiendas y productos --

-- Tabla Tiendas
CREATE TABLE tiendas
(
    id_tienda    SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    telefono     VARCHAR(20),
    email        VARCHAR(100),
    id_direccion INTEGER      NOT NULL,
    FOREIGN KEY (id_direccion) REFERENCES direcciones (id_direccion)
);

-- Tabla Tiendas_Empleados
CREATE TABLE tiendas_empleados
(
    id_tienda_empleado SERIAL PRIMARY KEY,
    id_tienda          INTEGER NOT NULL,
    id_empleado        INTEGER NOT NULL,
    FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda),
    FOREIGN KEY (id_empleado) REFERENCES usuarios (id_usuario),
    UNIQUE (id_tienda, id_empleado)
);

-- Tabla Subcategorias
CREATE TABLE subcategorias
(
    id_subcategoria SERIAL PRIMARY KEY,
    id_categoria    INTEGER      NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
);

-- Tabla Productos
CREATE TABLE productos
(
    id_producto     SERIAL PRIMARY KEY,
    id_medida       INTEGER        NOT NULL,
    id_unidad       INTEGER        NOT NULL,
    id_subcategoria INTEGER        NOT NULL,
    nombre          VARCHAR(200)   NOT NULL,
    fecha_entrada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_estatus      INTEGER        NOT NULL,
    precio_base     DECIMAL(10, 2) NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    codigo_barras   VARCHAR(50) UNIQUE,
    imagen_url      TEXT,
    FOREIGN KEY (id_medida) REFERENCES medidas (id_medida),
    FOREIGN KEY (id_unidad) REFERENCES unidades_medida (id_unidad),
    FOREIGN KEY (id_subcategoria) REFERENCES subcategorias (id_subcategoria),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus)
);

-- Tabla Stock
CREATE TABLE stock
(
    id_stock     SERIAL PRIMARY KEY,
    id_tienda    INTEGER NOT NULL,
    id_producto  INTEGER NOT NULL,
    stock_minimo INTEGER DEFAULT 0,
    stock_actual INTEGER DEFAULT 0,
    FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda),
    FOREIGN KEY (id_producto) REFERENCES productos (id_producto),
    UNIQUE (id_tienda, id_producto)
);

-- Tabla Proveedores
CREATE TABLE proveedores
(
    id_proveedor   SERIAL PRIMARY KEY,
    id_persona     INTEGER      NOT NULL,
    id_metodo_pago INTEGER,
    razon_social   VARCHAR(200) NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago (id_metodo_pago)
);

-- Tabla Sesiones
CREATE TABLE sesiones
(
    id_sesion    SERIAL PRIMARY KEY,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin    TIMESTAMP,
    id_usuario   INTEGER NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);

-- Tabla Ventas
CREATE TABLE ventas
(
    id_venta       SERIAL PRIMARY KEY,
    id_usuario     INTEGER NOT NULL,
    id_sesion      INTEGER,
    fecha_hora     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_metodo_pago INTEGER NOT NULL,
    id_estatus     INTEGER NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_sesion) REFERENCES sesiones (id_sesion),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago (id_metodo_pago),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus)
);

-- Tabla Detalle_Ventas
CREATE TABLE detalle_ventas
(
    id_detalle_venta SERIAL PRIMARY KEY,
    venta_id         INTEGER NOT NULL,
    producto_id      INTEGER NOT NULL,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario  DECIMAL(10, 2), -- Precio al momento de la venta
    FOREIGN KEY (venta_id) REFERENCES ventas (id_venta),
    FOREIGN KEY (producto_id) REFERENCES productos (id_producto)
);

-- Tabla Comprobantes
CREATE TABLE comprobantes
(
    id_comprobante     SERIAL PRIMARY KEY,
    id_venta           INTEGER        NOT NULL,
    id_estatus         INTEGER        NOT NULL,
    codigo_hash        VARCHAR(255)   NOT NULL,
    numero_correlativo INTEGER UNIQUE NOT NULL,
    fecha_emision      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_venta) REFERENCES ventas (id_venta),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus)
);

-- Tabla Compras
CREATE TABLE compras
(
    id_compra    SERIAL PRIMARY KEY,
    fecha_hora   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_proveedor INTEGER NOT NULL,
    id_estatus   INTEGER NOT NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus)
);

-- Tabla Detalle_Compras
CREATE TABLE detalle_compras
(
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra         INTEGER NOT NULL,
    producto_id       INTEGER NOT NULL,
    cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
    precio_compra     DECIMAL(10, 2), -- Precio al momento de la compra
    FOREIGN KEY (id_compra) REFERENCES compras (id_compra),
    FOREIGN KEY (producto_id) REFERENCES productos (id_producto)
);

-- Tabla Promociones
CREATE TABLE promociones
(
    id_promocion      SERIAL PRIMARY KEY,
    id_tipo_descuento INTEGER        NOT NULL,
    id_proveedor      INTEGER        NOT NULL,
    valor_descuento   DECIMAL(10, 2) NOT NULL,
    fecha_inicio      TIMESTAMP      NOT NULL,
    fecha_fin         TIMESTAMP      NOT NULL,
    codigo_cupon      VARCHAR(50) UNIQUE,
    nombre            VARCHAR(50),
    id_estatus        INTEGER        NOT NULL,
    FOREIGN KEY (id_tipo_descuento) REFERENCES tipo_descuento (id_tipo_descuento),
    FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor),
    FOREIGN KEY (id_estatus) REFERENCES estatus (id_estatus),
    CHECK (fecha_fin > fecha_inicio)
);

-- Tabla Promociones_Productos
CREATE TABLE promociones_productos
(
    id_promocion_producto SERIAL PRIMARY KEY,
    id_promocion          INTEGER NOT NULL,
    id_producto           INTEGER NOT NULL,
    FOREIGN KEY (id_promocion) REFERENCES promociones (id_promocion),
    FOREIGN KEY (id_producto) REFERENCES productos (id_producto),
    UNIQUE (id_promocion, id_producto)
);

-- Tablas de las tiendas y productos --