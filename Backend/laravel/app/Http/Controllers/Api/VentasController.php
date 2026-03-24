<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentasController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'id_usuario' => 'required|integer|exists:usuarios,id_usuario',
            'id_sesion' => 'nullable|integer|exists:sesiones,id_sesion',
            'id_metodo_pago' => 'required|integer|exists:metodos_pago,id_metodo_pago',
            'id_tienda' => 'required|integer|exists:tiendas,id_tienda',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id_producto',
            'detalles.*.cantidad' => 'required|integer|min:1',
        ]);

        try {
            // Insert sale
            $idVenta = DB::table('ventas')->insertGetId([
                'id_usuario' => $data['id_usuario'],
                'id_sesion' => $data['id_sesion'] ?? null,
                'id_metodo_pago' => $data['id_metodo_pago'],
                'id_tienda' => $data['id_tienda'],
                'id_estatus' => $data['id_estatus'] ?? 1,
                'fecha_venta' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Insert sale details
            foreach ($data['detalles'] as $detalle) {
                $producto = DB::table('productos')->find($detalle['producto_id']);
                
                DB::table('detalle_ventas')->insert([
                    'id_venta' => $idVenta,
                    'id_producto' => $detalle['producto_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_unitario' => $producto->precio_unitario,
                    'subtotal' => $detalle['cantidad'] * $producto->precio_unitario,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return response()->json([
                'message' => 'Venta registrada correctamente.',
                'id_venta' => $idVenta,
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar la venta.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }
}
