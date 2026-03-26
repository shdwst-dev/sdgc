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
    Route::post('/usuarios/registrar', [UsuariosController::class, 'registrar']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/graficas/ingresos-vs-gastos', [DashboardDataController::class, 'graficaIngresosVsGastos']);
        Route::get('/graficas/productos-mas-vendidos', [DashboardDataController::class, 'graficaProductosMasVendidos']);
        Route::get('/graficas/utilidad', [DashboardDataController::class, 'graficaUtilidad']);

        Route::post('/compras/registrar', [ComprasController::class, 'registrar']);
        Route::get('/compras/{idCompra}', [ComprasController::class, 'ver']);
        Route::put('/compras/{idCompra}', [ComprasController::class, 'actualizar']);
        Route::delete('/compras/{idCompra}', [ComprasController::class, 'eliminar']);
        Route::post('/ventas/registrar', [VentasController::class, 'registrar']);
        Route::post('/proveedores/registrar', [ProveedoresController::class, 'registrar']);
        Route::get('/proveedores/{idProveedor}', [ProveedoresController::class, 'ver']);
        Route::put('/proveedores/{idProveedor}', [ProveedoresController::class, 'actualizar']);
        Route::delete('/proveedores/{idProveedor}', [ProveedoresController::class, 'eliminar']);
        Route::post('/clientes/registrar', [ClientesController::class, 'registrar']);
        Route::get('/clientes/{idCliente}', [ClientesController::class, 'ver']);
        Route::put('/clientes/{idCliente}', [ClientesController::class, 'actualizar']);
        Route::delete('/clientes/{idCliente}', [ClientesController::class, 'eliminar']);

        Route::get('/productos', [ProductosController::class, 'listar']);
        Route::get('/productos/{idProducto}', [ProductosController::class, 'leer'])->whereNumber('idProducto');
        Route::post('/productos', [ProductosController::class, 'crear']);
        Route::put('/productos/{idProducto}', [ProductosController::class, 'actualizar']);
        Route::put('/productos/{idProducto}/stock-tienda', [ProductosController::class, 'actualizarStockTienda']);
        Route::delete('/productos/{idProducto}', [ProductosController::class, 'eliminar']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
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
});
