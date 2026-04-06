<?php

use App\Http\Controllers\Api\DashboardDataController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientesController;
use App\Http\Controllers\Api\ComprasController;
use App\Http\Controllers\Api\ProductosController;
use App\Http\Controllers\Api\ProveedoresController;
use App\Http\Controllers\Api\UsuariosController;
use App\Http\Controllers\Api\VentasController;
use Illuminate\Support\Facades\Route;


Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/usuarios/registrar', [UsuariosController::class, 'registrar']);

    Route::middleware('auth:sanctum')->group(function () {
        // ─── Auth (accesible a todos los roles autenticados) ─────────
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('/auth/temporary-password', [AuthController::class, 'replaceTemporaryPassword']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // ─── Productos (accesible a Admin y Comprador) ───────────────
        Route::get('/productos', [ProductosController::class, 'listar']);
        Route::get('/productos/{idProducto}', [ProductosController::class, 'leer'])->whereNumber('idProducto');

        // ─── Ventas: registrar (Comprador + Admin) ───────────────────
        Route::post('/ventas/registrar', [VentasController::class, 'registrar']);

        // ─── Rutas exclusivas de Admin ───────────────────────────────
        Route::middleware('admin')->group(function () {
            Route::get('/graficas/ingresos-vs-gastos', [DashboardDataController::class, 'graficaIngresosVsGastos']);
            Route::get('/graficas/productos-mas-vendidos', [DashboardDataController::class, 'graficaProductosMasVendidos']);
            Route::get('/graficas/utilidad', [DashboardDataController::class, 'graficaUtilidad']);
            Route::get('/facturacion/{idComprobante}', [DashboardDataController::class, 'verFactura']);
            Route::delete('/facturacion/{idComprobante}', [DashboardDataController::class, 'eliminarFactura']);
            Route::get('/configuracion/empleados/{idEmpleado}', [DashboardDataController::class, 'verEmpleadoConfiguracion']);
            Route::put('/configuracion/empleados/{idEmpleado}', [DashboardDataController::class, 'actualizarEmpleadoConfiguracion']);
            Route::delete('/configuracion/empleados/{idEmpleado}', [DashboardDataController::class, 'eliminarEmpleadoConfiguracion']);

            Route::post('/compras/registrar', [ComprasController::class, 'registrar']);
            Route::get('/compras/{idCompra}', [ComprasController::class, 'ver']);
            Route::put('/compras/{idCompra}', [ComprasController::class, 'actualizar']);
            Route::delete('/compras/{idCompra}', [ComprasController::class, 'eliminar']);
            Route::post('/proveedores/registrar', [ProveedoresController::class, 'registrar']);
            Route::get('/proveedores/{idProveedor}', [ProveedoresController::class, 'ver']);
            Route::put('/proveedores/{idProveedor}', [ProveedoresController::class, 'actualizar']);
            Route::delete('/proveedores/{idProveedor}', [ProveedoresController::class, 'eliminar']);
            Route::post('/clientes/registrar', [ClientesController::class, 'registrar']);
            Route::get('/clientes/{idCliente}', [ClientesController::class, 'ver']);
            Route::put('/clientes/{idCliente}', [ClientesController::class, 'actualizar']);
            Route::delete('/clientes/{idCliente}', [ClientesController::class, 'eliminar']);

            Route::post('/productos', [ProductosController::class, 'crear']);
            Route::put('/productos/{idProducto}', [ProductosController::class, 'actualizar']);
            Route::put('/productos/{idProducto}/stock-tienda', [ProductosController::class, 'actualizarStockTienda']);
            Route::delete('/productos/{idProducto}', [ProductosController::class, 'eliminar']);
        });
    });
});

// ─── Rutas sin prefijo /v1 (consumidas por AppWeb) ───────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/dashboard', [DashboardDataController::class, 'dashboard']);
    Route::get('/dashboard/ventas-recientes', [DashboardDataController::class, 'ventasRecientes']);
    Route::get('/dashboard/alertas-stock', [DashboardDataController::class, 'alertasStock']);
    Route::get('/dashboard/top-productos', [DashboardDataController::class, 'topProductos']);
    Route::get('/inventario', [DashboardDataController::class, 'inventario']);
    Route::get('/compras', [DashboardDataController::class, 'compras']);
    Route::get('/ventas', [DashboardDataController::class, 'ventas']);
    Route::get('/proveedores', [DashboardDataController::class, 'proveedores']);
    Route::get('/clientes', [DashboardDataController::class, 'clientes']);
    Route::get('/facturacion', [DashboardDataController::class, 'facturacion']);
    Route::get('/reportes', [DashboardDataController::class, 'reportes']);
    Route::get('/configuracion', [DashboardDataController::class, 'configuracion']);
    Route::get('/configuracion/stats', [DashboardDataController::class, 'configuracionStats']);
    Route::put('/configuracion', [DashboardDataController::class, 'actualizarConfiguracion']);
});
