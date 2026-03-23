<?php

use App\Http\Controllers\Api\DashboardDataController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard', [DashboardDataController::class, 'dashboard']);
Route::get('/inventario', [DashboardDataController::class, 'inventario']);
Route::get('/compras', [DashboardDataController::class, 'compras']);
Route::get('/ventas', [DashboardDataController::class, 'ventas']);
Route::get('/proveedores', [DashboardDataController::class, 'proveedores']);
Route::get('/clientes', [DashboardDataController::class, 'clientes']);
Route::get('/facturacion', [DashboardDataController::class, 'facturacion']);
Route::get('/reportes', [DashboardDataController::class, 'reportes']);
Route::get('/configuracion', [DashboardDataController::class, 'configuracion']);
