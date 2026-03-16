<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComprasController;
use App\Http\Controllers\Api\UsuariosController;
use App\Http\Controllers\Api\VentasController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/usuarios/registrar', [UsuariosController::class, 'registrar']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::post('/compras/registrar', [ComprasController::class, 'registrar']);
        Route::post('/ventas/registrar', [VentasController::class, 'registrar']);
    });
});
