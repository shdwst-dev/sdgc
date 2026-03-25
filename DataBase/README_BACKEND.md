# Documentacion completa del Backend (Laravel + PostgreSQL)

## 1. Vision general

Este backend implementa la logica de negocio de un sistema de gestion comercial usando:

- Laravel 12 (PHP 8.2+)
- Autenticacion con Laravel Sanctum
- PostgreSQL como motor de base de datos
- Procedimientos almacenados, tipos compuestos y triggers para operaciones criticas

Arquitectonicamente, el backend combina dos enfoques:

1. API REST en Laravel para autenticacion, seguridad HTTP y validaciones de entrada.
2. Logica de negocio principal en base de datos (stored procedures + triggers) para registro de usuarios, compras, ventas y gestion de stock.

Esto hace que el flujo sea:

Cliente (Web/Movil) -> Endpoint API Laravel -> Controller -> Validacion -> SQL (CALL/Query Builder) -> PostgreSQL -> JSON de respuesta

## 2. Estructura relevante del backend

Carpeta principal:

- Backend/laravel

Elementos clave:

- routes/api.php: define todos los endpoints API usados por frontend.
- app/Http/Controllers/Api: controladores REST.
- app/Models: modelos Eloquent y relaciones.
- config/database.php: conexiones a base de datos.
- config/cors.php: politica CORS.
- config/sanctum.php: configuracion de autenticacion por token.
- bootstrap/app.php: bootstrap de Laravel y middleware general.
- DataBase/creacion.sql: esquema de tablas.
- DataBase/poblarBD.sql: datos semilla de catalogos y demo.
- DataBase/funciones.sql: procedures, functions, types y triggers.

## 3. Stack tecnico y dependencias

Segun composer.json:

- php: ^8.2
- laravel/framework: ^12.0
- laravel/sanctum: ^4.3
- laravel/tinker: ^2.10.1

Dependencias de desarrollo:

- phpunit, pint, faker, collision, etc.

## 4. Configuracion y conexion a base de datos

### 4.1 Conexion

La conexion por defecto de Laravel viene por variable de entorno DB_CONNECTION (por defecto sqlite), pero este proyecto esta orientado a PostgreSQL.

Variables minimas esperadas en .env para PostgreSQL:

- DB_CONNECTION=pgsql
- DB_HOST=127.0.0.1
- DB_PORT=5432
- DB_DATABASE=sdgc
- DB_USERNAME=...
- DB_PASSWORD=...

### 4.2 CORS

Actualmente CORS permite cualquier origen/metodo/header:

- paths: api/* y sanctum/csrf-cookie
- allowed_origins: *
- allowed_methods: *

### 4.3 CSRF para API

En bootstrap/app.php se excluye api/* de validacion CSRF, correcto para API tokenizada.

## 5. Autenticacion y seguridad

### 5.1 Modelo autenticable

Se usa App\Models\usuarios (tabla usuarios) como Authenticatable, con:

- HasApiTokens (Sanctum)
- Notifiable
- Campo oculto: contrasena
- getAuthPassword() devuelve contrasena

### 5.2 Flujo de login

Endpoint: POST /api/v1/auth/login

Proceso:

1. Valida email y contrasena.
2. Busca usuario + relaciones profundas:
   persona -> direccion -> calle -> colonia -> municipio -> estado -> pais
   y tambien rol + estatus.
3. Valida password:
   - primero Hash::check (bcrypt/compatible)
   - fallback legacy: compara texto plano una vez y migra a hash.
4. Genera token con createToken('api').
5. Responde token + estructura de usuario anidada.

### 5.3 Endpoints protegidos

Bajo middleware auth:sanctum:

- GET /api/v1/auth/me
- POST /api/v1/auth/logout
- GET /api/v1/graficas/ingresos-vs-gastos
- GET /api/v1/graficas/productos-mas-vendidos
- GET /api/v1/graficas/utilidad
- POST /api/v1/compras/registrar
- POST /api/v1/ventas/registrar
- POST /api/v1/productos
- PUT /api/v1/productos/{idProducto}
- DELETE /api/v1/productos/{idProducto}
- GET /api/dashboard
- GET /api/dashboard/ventas-recientes
- GET /api/dashboard/alertas-stock
- GET /api/dashboard/top-productos
- GET /api/inventario
- GET /api/compras
- GET /api/ventas
- GET /api/proveedores
- GET /api/clientes
- GET /api/facturacion
- GET /api/reportes
- GET /api/configuracion

### 5.4 Nota importante de despliegue

Se detecta historico de error por tabla faltante personal_access_tokens (Sanctum). Eso ocurre si no se ejecutaron migraciones de Laravel/Sanctum.

Recomendacion:

- ejecutar migraciones de Laravel antes de usar login con tokens.

## 6. Rutas API completas

## 6.1 Endpoints de dashboard (sin prefijo v1)

Nota: estos endpoints no usan prefijo /v1, pero actualmente si requieren Bearer token (middleware auth:sanctum).

- GET /api/dashboard
- GET /api/dashboard/ventas-recientes
- GET /api/dashboard/alertas-stock
- GET /api/dashboard/top-productos
- GET /api/inventario
- GET /api/compras
- GET /api/ventas
- GET /api/proveedores
- GET /api/clientes
- GET /api/facturacion
- GET /api/reportes
- GET /api/configuracion

Estos endpoints generan datasets para vistas de AppWeb (dashboard y modulos).

## 6.2 Endpoints v1

Publicos:

- POST /api/v1/auth/login
- POST /api/v1/usuarios/registrar

Privados (Bearer token Sanctum):

- GET /api/v1/auth/me
- POST /api/v1/auth/logout
- GET /api/v1/graficas/ingresos-vs-gastos
- GET /api/v1/graficas/productos-mas-vendidos
- GET /api/v1/graficas/utilidad
- POST /api/v1/compras/registrar
- POST /api/v1/ventas/registrar
- POST /api/v1/productos
- PUT /api/v1/productos/{idProducto}
- DELETE /api/v1/productos/{idProducto}

## 7. Contratos de entrada por endpoint

## 7.1 AuthController

### POST /api/v1/auth/login

Body requerido:

- email: string
- contrasena: string

Respuesta:

- token
- usuario con datos de rol, estatus y direccion completa anidada

### GET /api/v1/auth/me

- requiere Bearer token
- retorna usuario autenticado con persona, rol y estatus

### POST /api/v1/auth/logout

- requiere Bearer token
- elimina token actual

## 7.2 UsuariosController

### POST /api/v1/usuarios/registrar

Body:

- nombre: required string max 100
- apellido_paterno: required string max 100
- apellido_materno: nullable string max 100
- telefono: required string max 20
- id_direccion: required integer (existe en direcciones)
- email: required email max 100
- contrasena: required string min 8
- id_rol: nullable integer (existe en roles)
- id_estatus: nullable integer (existe en estatus)

Operacion real:

- llama al procedure pa_registrar_usuario(...)
- hashea password en Laravel antes de enviar

## 7.3 ProductosController

### POST /api/v1/productos

Crea producto via pa_crear_producto.

Body valido:

- id_medida, id_unidad, id_subcategoria
- nombre
- precio_base, precio_unitario
- codigo_barras (nullable)
- imagen_url (nullable)
- id_estatus (nullable, default 1)

### PUT /api/v1/productos/{idProducto}

Actualiza producto via pa_actualizar_producto.

Body:

- nombre
- precio_base
- precio_unitario
- codigo_barras (nullable)
- imagen_url (nullable)
- id_estatus

### DELETE /api/v1/productos/{idProducto}

Elimina logico via pa_eliminar_producto (cambia estatus a Inactivo).

## 7.4 ComprasController

### POST /api/v1/compras/registrar

Body:

- id_proveedor
- id_tienda
- id_estatus (nullable)
- detalles[] minimo 1
- detalles[].producto_id
- detalles[].cantidad
- detalles[].precio_compra

Operacion:

- convierte detalles a literal PostgreSQL ARRAY[ROW(...)]::detalle_compra_type[]
- ejecuta pa_registrar_compra

## 7.5 VentasController

### POST /api/v1/ventas/registrar

Body:

- id_usuario
- id_sesion (nullable)
- id_metodo_pago
- id_tienda
- id_estatus (nullable)
- detalles[] minimo 1
- detalles[].producto_id
- detalles[].cantidad

Operacion:

- construye ARRAY[ROW(...)]::detalle_venta_type[]
- ejecuta pa_registrar_venta

## 7.6 DashboardDataController

### GET /api/dashboard

Devuelve:

- periodo_referencia
- metricas de ingresos/gastos/ganancia
- flujo_mensual por dia

### GET /api/dashboard/ventas-recientes

Devuelve:

- ventas_recientes (ultimas ventas formateadas para dashboard)

### GET /api/dashboard/alertas-stock

Devuelve:

- alertas_stock (productos con stock_actual <= stock_minimo)

### GET /api/dashboard/top-productos

Devuelve:

- periodo_referencia del mes
- top_productos (ranking de productos mas vendidos del mes)

### GET /api/inventario

Devuelve:

- metricas inventario
- listado de categorias
- productos con estado de stock (Disponible, Stock bajo, Sin stock)

### GET /api/compras

Devuelve:

- metricas de ordenes/gasto/proveedores
- ordenes de compra formateadas

### GET /api/ventas

Devuelve:

- catalogo de productos para vender
- metodos de pago
- venta_en_curso (si existe venta pendiente)

### GET /api/proveedores

Devuelve listado de proveedores con metricas de productos y ultimo pedido.

### GET /api/clientes

Devuelve usuarios con rol Comprador como clientes.

### GET /api/facturacion

Devuelve comprobantes/facturas con total y estado.

### GET /api/reportes

Devuelve metricas globales del mes (ventas, costos, utilidad, facturas pendientes).

### GET /api/configuracion

Devuelve datos del negocio/tienda principal y direccion.

## 8. Logica SQL central (procedures/functions/triggers)

Definida en DataBase/funciones.sql.

## 8.1 Types compuestos

- detalle_compra_type(producto_id, cantidad, precio_compra)
- detalle_venta_type(producto_id, cantidad)

Estos types permiten enviar arreglos de detalles desde Laravel a PostgreSQL en una sola llamada.

## 8.2 Procedures

- pa_registrar_usuario
  - valida email y telefono unicos
  - inserta persona y usuario
  - maneja transaccion con commit/rollback

- pa_registrar_compra
  - crea compra
  - recorre arreglo de detalles e inserta detalle_compras
  - define variable de sesion app.id_tienda para triggers de stock

- pa_registrar_venta
  - crea venta
  - obtiene precio_unitario del producto al momento de la venta
  - inserta detalle_ventas
  - define app.id_tienda para triggers

- pa_crear_producto
  - evita duplicado por nombre + subcategoria
  - inserta producto

- pa_eliminar_producto
  - valida existencia
  - elimina logico via id_estatus=2

- pa_actualizar_producto
  - valida existencia
  - actualiza campos editables

## 8.3 Functions trigger

- fn_actualizar_stock
  - AFTER INSERT en detalle_compras: suma stock
  - AFTER INSERT en detalle_ventas: resta stock
  - usa current_setting('app.id_tienda')

- fn_validar_stock
  - BEFORE INSERT en detalle_ventas
  - bloquea venta si stock insuficiente

## 8.4 Triggers instalados

- tr_actualizar_stock_compra
- tr_actualizar_stock_venta
- tr_validar_stock

## 9. Modelo de datos (tablas y dominios)

Esquema principal (DataBase/creacion.sql):

1. Direcciones y geografia:
   - paises, estados, municipios, colonias, calles, direcciones

2. Catalogos base:
   - roles, estatus, metodos_pago, unidades_medida, tipo_descuento, categorias, medidas

3. Personas y cuentas:
   - personas, usuarios

4. Operacion comercial:
   - tiendas, tiendas_empleados
   - subcategorias, productos, stock
   - proveedores
   - sesiones, ventas, detalle_ventas, comprobantes
   - compras, detalle_compras
   - promociones, promociones_productos

## 10. Modelos Eloquent y relaciones principales

### 10.1 Autenticacion y personas

- usuarios -> belongsTo persona, rol, estatus
- personas -> belongsTo direccion; hasOne usuario/proveedor
- direccion -> belongsTo calle
- calle -> belongsTo colonia
- colonia -> belongsTo municipio
- municipio -> belongsTo estado
- estado -> belongsTo pais

### 10.2 Catalogos

- roles -> hasMany usuarios
- estatus -> usado por productos/compras/ventas/comprobantes
- metodos_pago -> usado por ventas/compras/proveedores

### 10.3 Comercial

- productos -> belongsTo medida, unidad, subcategoria, estatus
- stock -> belongsTo tienda y producto
- compras -> belongsTo proveedor, metodo_pago, estatus
- detalle_compras -> belongsTo compra y producto
- ventas -> belongsTo usuario, sesion, metodo_pago, estatus
- detalle_ventas -> belongsTo venta y producto
- comprobantes -> belongsTo venta y estatus

Nota: en el codigo existen algunas relaciones con nombres de clase potencialmente inconsistentes (por ejemplo pluralizaciones en ciertos modelos). Como la capa principal de consulta usa Query Builder y procedures, no rompe los endpoints actuales, pero conviene normalizar para mantenimiento.

## 11. Flujo funcional por modulo

## 11.1 Registro de usuario

1. Frontend envia datos personales y de cuenta.
2. Laravel valida Request.
3. Laravel hashea password.
4. SQL procedure inserta persona y usuario.
5. API devuelve mensaje de exito o error de negocio.

## 11.2 Login y sesion API

1. Frontend envia email + contrasena.
2. Laravel valida credenciales.
3. Sanctum genera token.
4. Frontend guarda token y lo envia como Bearer.
5. Endpoints protegidos operan con auth:sanctum.

## 11.3 Registrar compra

1. Frontend envia proveedor, tienda y detalles.
2. Controller transforma detalles a arreglo tipado PostgreSQL.
3. Procedure inserta compra y detalles.
4. Trigger incrementa stock por tienda/producto.

## 11.4 Registrar venta

1. Frontend envia usuario, tienda, metodo y detalles.
2. Procedure crea venta y detalle con precio vigente.
3. Trigger valida stock antes de insertar detalle.
4. Trigger descuenta stock al insertar detalle.

## 12. Formato de errores y respuestas

Patrones comunes:

- 201 para creacion exitosa (registro usuario, compra, venta, producto)
- 200 para consultas/actualizaciones/eliminacion logica
- 422 para errores de validacion de negocio/DB (QueryException)

En errores de DB, se devuelve mensaje + detalle de motor cuando existe en errorInfo[2].

## 13. Integracion con frontend

Este backend alimenta principalmente:

- AppWeb (pantallas dashboard, inventario, ventas, compras, proveedores, clientes, facturacion, reportes, configuracion)
- AppMovil (segun modulo implementado)

Rutas de dashboard estan pensadas para devolver objetos listos para UI. La informacion principal permanece en /api/dashboard y los listados de ventas recientes, alertas de stock y top productos se consultan en endpoints separados para carga modular de la interfaz.

## 14. Orden recomendado de inicializacion

1. Crear base de datos PostgreSQL.
2. Ejecutar DataBase/creacion.sql.
3. Ejecutar DataBase/funciones.sql.
4. Ejecutar DataBase/poblarBD.sql (opcional para demo).
5. Configurar .env con DB_CONNECTION=pgsql y credenciales.
6. Ejecutar migraciones de Laravel (incluyendo Sanctum).
7. Iniciar servidor Laravel.

## 15. Comandos utiles (referencia)

En Backend/laravel:

- composer install
- cp .env.example .env (o equivalente en Windows)
- php artisan key:generate
- php artisan migrate
- php artisan serve

Para pruebas:

- php artisan test

## 16. Riesgos tecnicos y mejoras sugeridas

1. Estandarizar naming en modelos/relaciones Eloquent (singular/plural y nombres de clases).
2. Añadir documentacion OpenAPI/Swagger para contratos versionados.
3. Agregar Resource classes de Laravel para respuestas consistentes.
4. Incluir politicas/roles por endpoint (authorization) mas granular.
5. Parametrizar CORS para produccion (evitar allowed_origins=*).
6. Añadir pruebas de integracion para procedures criticos (compra/venta/stock).

---

## Resumen ejecutivo

El backend esta diseñado para centralizar reglas de negocio criticas en PostgreSQL y usar Laravel como capa segura de API, validacion y autenticacion. Los endpoints cubren autenticacion, alta de usuarios, CRUD logico de productos, registro transaccional de compras/ventas y consultas de negocio para dashboard. La pieza mas importante de consistencia es la cadena procedure + trigger que mantiene stock por tienda en tiempo real.