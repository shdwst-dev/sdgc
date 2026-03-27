--Inserts de la base de datos

-- =============================================
-- 1. CATÁLOGOS BÁSICOS (Sin dependencias)
-- =============================================

-- Tabla Roles
INSERT INTO roles (nombre)
VALUES ('Administrador'),
       ('Super Admin'),
       ('Comprador'),
       ('Vendedor');

-- Tabla Estatus
INSERT INTO estatus (nombre)
VALUES ('Activo'),
       ('Inactivo'),
       ('Pendiente'),
       ('Completado'),
       ('Cancelado'),
       ('En Proceso'),
       ('Suspendido');

-- Tabla Metodos_Pago
INSERT INTO metodos_pago (nombre)
VALUES ('Efectivo'),
       ('Tarjeta de Crédito'),
       ('Tarjeta de Débito'),
       ('Transferencia'),
       ('PayPal'),
       ('Mercado Pago');

-- Tabla Unidades_medida
INSERT INTO unidades_medida (nombre, abreviatura)
VALUES ('Kilogramo', 'kg'),
       ('Gramo', 'g'),
       ('Litro', 'L'),
       ('Mililitro', 'ml'),
       ('Pieza', 'pz'),
       ('Caja', 'cja'),
       ('Metro', 'm'),
       ('Centímetro', 'cm');

-- Tabla Tipo_descuento
INSERT INTO tipo_descuento (nombre)
VALUES ('Porcentaje'),
       ('Monto Fijo'),
       ('2x1'),
       ('3x2');

-- Tabla Categorias
INSERT INTO categorias (nombre)
VALUES ('Electrónica'),
       ('Alimentos'),
       ('Bebidas'),
       ('Limpieza'),
       ('Hogar'),
       ('Papelería'),
       ('Ropa'),
       ('Deportes');

-- Tabla Medidas
INSERT INTO medidas (altura, ancho, peso, volumen)
VALUES (10.5, 5.2, 0.25, 0.55),
       (20.0, 15.0, 1.50, 4.50),
       (30.5, 25.0, 2.00, 22.88),
       (5.0, 5.0, 0.10, 0.13),
       (50.0, 40.0, 5.00, 100.00),
       (15.0, 10.0, 0.80, 1.50),
       (8.0, 6.0, 0.30, 0.29),
       (100.0, 50.0, 10.00, 500.00);

-- =============================================
-- 2. DIRECCIONES (Jerarquía geográfica)
-- =============================================

-- Tabla Paises
INSERT INTO paises (nombre)
VALUES ('México'),
       ('Estados Unidos'),
       ('España');

-- Tabla Estados
INSERT INTO estados (id_pais, nombre)
VALUES (1, 'Jalisco'),
       (1, 'Ciudad de México'),
       (1, 'Nuevo León'),
       (1, 'Guanajuato'),
       (1, 'Puebla'),
       (2, 'California'),
       (2, 'Texas');

-- Tabla Municipios
INSERT INTO municipios (id_estado, nombre)
VALUES (1, 'Guadalajara'),
       (1, 'Zapopan'),
       (1, 'Tlaquepaque'),
       (2, 'Benito Juárez'),
       (2, 'Miguel Hidalgo'),
       (3, 'Monterrey'),
       (3, 'San Pedro Garza García'),
       (4, 'León'),
       (5, 'Puebla');

-- Tabla Colonias
INSERT INTO colonias (id_municipio, nombre, cp)
VALUES (1, 'Centro', 44100),
       (1, 'Americana', 44160),
       (2, 'Chapalita', 45040),
       (2, 'Providencia', 44630),
       (3, 'Centro', 45500),
       (4, 'Roma Norte', 6700),
       (5, 'Polanco', 11560),
       (6, 'Centro', 64000),
       (7, 'Del Valle', 66220),
       (8, 'Centro', 37000);

-- Tabla Calles
INSERT INTO calles (id_colonia, nombre)
VALUES (1, 'Avenida Juárez'),
       (1, 'Calle Morelos'),
       (2, 'Avenida Américas'),
       (3, 'Avenida Chapultepec'),
       (4, 'Avenida López Mateos'),
       (5, 'Calle Independencia'),
       (6, 'Avenida Álvaro Obregón'),
       (7, 'Calle Masaryk'),
       (8, 'Avenida Constitución'),
       (9, 'Calle Hidalgo');

-- Tabla Direcciones
INSERT INTO direcciones (id_calle, num_int, num_ext)
VALUES (1, 101, 1234),
       (2, NULL, 567),
       (3, 205, 890),
       (4, 302, 1500),
       (5, NULL, 234),
       (6, 12, 789),
       (7, 501, 2000),
       (8, NULL, 345),
       (9, 8, 1100),
       (1, NULL, 2500);

-- =============================================
-- 3. PERSONAS Y USUARIOS
-- =============================================

-- Tabla Personas
INSERT INTO personas (nombre, apellido_paterno, apellido_materno, telefono, id_direccion)
VALUES ('Juan', 'García', 'López', '3312345678', 1),
       ('María', 'Martínez', 'Pérez', '3323456789', 2),
       ('Carlos', 'Rodríguez', 'Sánchez', '3334567890', 3),
       ('Ana', 'Hernández', 'Gómez', '3345678901', 4),
       ('Luis', 'González', 'Díaz', '3356789012', 5),
       ('Carmen', 'Torres', 'Ramírez', '3367890123', 6),
       ('Pedro', 'Flores', 'Cruz', '3378901234', 7),
       ('Laura', 'Jiménez', 'Morales', '3389012345', 8),
       ('José', 'Ruiz', 'Ortiz', '3390123456', 9),
       ('Sofia', 'Mendoza', 'Castro', '3301234567', 10);

-- Tabla Usuarios
INSERT INTO usuarios (id_persona, contrasena, email, id_rol, id_estatus)
VALUES (1, 'hash123admin', 'juan.garcia@tienda.com', 1, 1),
       (2, 'hash456comprador', 'maria.martinez@tienda.com', 2, 1),
       (3, 'hash789vendedor', 'carlos.rodriguez@tienda.com', 3, 1),
       (4, 'hash101vendedor', 'ana.hernandez@tienda.com', 3, 1),
       (5, 'hash102comprador', 'luis.gonzalez@tienda.com', 2, 1),
       (6, 'hash103vendedor', 'carmen.torres@tienda.com', 3, 1),
       (7, 'hash104vendedor', 'pedro.flores@tienda.com', 3, 1),
       (8, 'hash105admin', 'laura.jimenez@tienda.com', 1, 1),
       (9, 'hash106vendedor', 'jose.ruiz@tienda.com', 3, 2),
       (10, 'hash107vendedor', 'sofia.mendoza@tienda.com', 3, 1);

-- =============================================
-- 4. TIENDAS Y EMPLEADOS
-- =============================================

-- Tabla Tiendas
INSERT INTO tiendas (nombre, telefono, email, id_direccion)
VALUES ('Tienda Centro Guadalajara', '3344556677', 'centro.gdl@tienda.com', 1),
       ('Tienda Américas', '3355667788', 'americas@tienda.com', 3),
       ('Tienda Chapalita', '3366778899', 'chapalita@tienda.com', 4),
       ('Tienda CDMX Roma', '5544332211', 'roma@tienda.com', 6),
       ('Tienda Monterrey Centro', '8199887766', 'monterrey@tienda.com', 8);

-- Tabla Tiendas_Empleados
INSERT INTO tiendas_empleados (id_tienda, id_empleado)
VALUES (1, 1),
       (1, 3),
       (1, 4),
       (2, 2),
       (2, 6),
       (3, 5),
       (3, 7),
       (4, 8),
       (5, 10);

-- =============================================
-- 5. PRODUCTOS E INVENTARIO
-- =============================================

-- Tabla Subcategorias
INSERT INTO subcategorias (id_categoria, nombre)
VALUES (1, 'Smartphones'),
       (1, 'Laptops'),
       (1, 'Accesorios'),
       (2, 'Frutas'),
       (2, 'Verduras'),
       (3, 'Refrescos'),
       (3, 'Jugos'),
       (4, 'Detergentes'),
       (5, 'Muebles'),
       (6, 'Cuadernos');

-- Tabla Productos
INSERT INTO productos (id_medida, id_unidad, id_subcategoria, nombre, precio_base, precio_unitario, codigo_barras,
                       imagen_url, id_estatus)
VALUES (2, 5, 1, 'Smartphone Samsung Galaxy A54', 5000.00, 6500.00, '7501234567890', 'samsung-a54.jpg', 1),
       (3, 5, 2, 'Laptop HP Pavilion 15', 12000.00, 15000.00, '7501234567891', 'hp-pavilion.jpg', 1),
       (1, 5, 3, 'Audífonos Bluetooth JBL', 500.00, 800.00, '7501234567892', 'jbl-audifonos.jpg', 1),
       (4, 1, 4, 'Manzanas Red Delicious', 25.00, 35.00, '7501234567893', 'manzanas.jpg', 1),
       (4, 1, 5, 'Lechuga Romana', 15.00, 22.00, '7501234567894', 'lechuga.jpg', 1),
       (6, 5, 6, 'Coca Cola 2L', 20.00, 28.00, '7501234567895', 'coca-cola.jpg', 1),
       (6, 3, 7, 'Jugo Jumex Naranja 1L', 18.00, 25.00, '7501234567896', 'jumex-naranja.jpg', 1),
       (6, 5, 8, 'Detergente Ariel 1kg', 80.00, 110.00, '7501234567897', 'ariel.jpg', 1),
       (8, 5, 9, 'Escritorio de Oficina', 1500.00, 2200.00, '7501234567898', 'escritorio.jpg', 1),
       (1, 5, 10, 'Cuaderno Profesional 100 hojas', 25.00, 40.00, '7501234567899', 'cuaderno.jpg', 1);

-- Tabla Stock
INSERT INTO stock (id_tienda, id_producto, stock_minimo, stock_actual)
VALUES (1, 1, 5, 20),
       (1, 2, 3, 10),
       (1, 3, 10, 50),
       (1, 4, 20, 100),
       (1, 5, 15, 80),
       (2, 1, 5, 15),
       (2, 6, 30, 150),
       (2, 7, 25, 120),
       (3, 8, 20, 90),
       (3, 9, 2, 5);

-- =============================================
-- 6. PROVEEDORES
-- =============================================

-- Tabla Proveedores (necesitan personas adicionales)
INSERT INTO proveedores (id_persona, id_metodo_pago, razon_social)
VALUES (1, 4, 'Distribuidora Electrónica del Sur SA de CV'),
       (2, 2, 'Alimentos Frescos del Campo SA'),
       (3, 4, 'Bebidas y Refrescos Nacional SA'),
       (4, 3, 'Productos de Limpieza Industriales SA');

-- =============================================
-- 7. SESIONES Y VENTAS
-- =============================================

-- Tabla Sesiones
INSERT INTO sesiones (fecha_inicio, fecha_fin, id_usuario)
VALUES ('2026-02-27 08:00:00', '2026-02-27 16:00:00', 3),
       ('2026-02-27 08:30:00', '2026-02-27 16:30:00', 6),
       ('2026-02-27 09:00:00', NULL, 10),
       ('2026-02-26 08:00:00', '2026-02-26 16:00:00', 3),
       ('2026-02-26 14:00:00', '2026-02-26 22:00:00', 6);

-- Tabla Ventas
INSERT INTO ventas (id_usuario, id_sesion, fecha_hora, id_metodo_pago, id_estatus)
VALUES (3, 1, '2026-02-27 10:30:00', 1, 4),
       (3, 1, '2026-02-27 11:45:00', 2, 4),
       (6, 2, '2026-02-27 12:20:00', 3, 4),
       (3, 1, '2026-02-27 13:15:00', 1, 4),
       (6, 2, '2026-02-27 14:00:00', 2, 4),
       (10, 3, '2026-02-27 15:30:00', 1, 3),
       (3, 4, '2026-02-26 10:00:00', 1, 4),
       (6, 5, '2026-02-26 16:30:00', 2, 4);

-- Tabla Detalle_Ventas
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
VALUES (1, 1, 1, 6500.00),
       (1, 3, 2, 800.00),
       (2, 4, 3, 35.00),
       (2, 5, 2, 22.00),
       (3, 6, 5, 28.00),
       (3, 7, 3, 25.00),
       (4, 8, 2, 110.00),
       (5, 1, 1, 6500.00),
       (6, 10, 5, 40.00),
       (7, 3, 1, 800.00);

-- Tabla Comprobantes
INSERT INTO comprobantes (id_venta, id_estatus, codigo_hash, numero_correlativo, fecha_emision)
VALUES (1, 1, 'a1b2c3d4e5f6g7h8i9j0', 1001, '2026-02-27 10:31:00'),
       (2, 1, 'b2c3d4e5f6g7h8i9j0k1', 1002, '2026-02-27 11:46:00'),
       (3, 1, 'c3d4e5f6g7h8i9j0k1l2', 1003, '2026-02-27 12:21:00'),
       (4, 1, 'd4e5f6g7h8i9j0k1l2m3', 1004, '2026-02-27 13:16:00'),
       (5, 1, 'e5f6g7h8i9j0k1l2m3n4', 1005, '2026-02-27 14:01:00'),
       (7, 1, 'f6g7h8i9j0k1l2m3n4o5', 1006, '2026-02-26 10:01:00'),
       (8, 1, 'g7h8i9j0k1l2m3n4o5p6', 1007, '2026-02-26 16:31:00');

-- =============================================
-- 8. COMPRAS
-- =============================================

-- Tabla Compras
INSERT INTO compras (fecha_hora, id_proveedor, id_estatus)
VALUES ('2026-02-20 10:00:00', 1, 4),
       ('2026-02-21 11:30:00', 2, 4),
       ('2026-02-22 09:00:00', 3, 4),
       ('2026-02-23 14:00:00', 4, 4),
       ('2026-02-25 10:30:00', 1, 4);

-- Tabla Detalle_Compras
INSERT INTO detalle_compras (id_compra, producto_id, cantidad, precio_compra)
VALUES (1, 1, 10, 5000.00),
       (1, 2, 5, 12000.00),
       (1, 3, 30, 500.00),
       (2, 4, 100, 25.00),
       (2, 5, 80, 15.00),
       (3, 6, 150, 20.00),
       (3, 7, 120, 18.00),
       (4, 8, 100, 80.00),
       (5, 1, 15, 5000.00),
       (5, 3, 40, 500.00);

-- =============================================
-- 9. PROMOCIONES
-- =============================================

-- Tabla Promociones
INSERT INTO promociones (id_tipo_descuento, id_proveedor, valor_descuento, fecha_inicio, fecha_fin, codigo_cupon,
                         nombre, id_estatus)
VALUES (1, 1, 10.00, '2026-02-25 00:00:00', '2026-03-10 23:59:59', 'ELECTRO10', 'Descuento Electrónica', 1),
       (1, 2, 15.00, '2026-02-27 00:00:00', '2026-03-05 23:59:59', 'FRUTAS15', 'Descuento Frutas', 1),
       (2, 3, 5.00, '2026-03-01 00:00:00', '2026-03-15 23:59:59', 'BEBIDAS5', 'Descuento Bebidas', 1),
       (3, 1, 0.00, '2026-02-28 00:00:00', '2026-03-07 23:59:59', '2X1AUDIO', '2x1 en Audífonos', 1);

-- Tabla Promociones_Productos
INSERT INTO promociones_productos (id_promocion, id_producto)
VALUES (1, 1),
       (1, 2),
       (1, 3),
       (2, 4),
       (2, 5),
       (3, 6),
       (3, 7),
       (4, 3);

-- =============================================
-- FIN DE INSERTS
-- =============================================
