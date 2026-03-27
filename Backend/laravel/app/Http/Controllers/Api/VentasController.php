<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Throwable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentasController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'id_usuario' => 'nullable|integer|exists:usuarios,id_usuario',
            'id_sesion' => 'nullable|integer|exists:sesiones,id_sesion',
            'id_metodo_pago' => 'required|integer|exists:metodos_pago,id_metodo_pago',
            'id_tienda' => 'nullable|integer|exists:tiendas,id_tienda',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id_producto',
            'detalles.*.cantidad' => 'required|integer|min:1',
        ]);

        $userId = $request->user()?->id_usuario ?? $data['id_usuario'] ?? null;
        $storeId = $data['id_tienda'] ?? DB::table('tiendas')->orderBy('id_tienda')->value('id_tienda');
        $statusId = $data['id_estatus'] ?? DB::table('estatus')->where('nombre', 'Completado')->value('id_estatus') ?? 1;

        if (!$userId) {
            return response()->json([
                'message' => 'No fue posible identificar al usuario que registra la venta.',
            ], 422);
        }

        if (!$storeId) {
            return response()->json([
                'message' => 'No existe una tienda disponible para registrar la venta.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($data, $userId, $storeId, $statusId) {
                DB::statement('SELECT set_config(?, ?, false)', [
                    'app.id_tienda',
                    (string) $storeId,
                ]);

                $ventaId = DB::table('ventas')->insertGetId([
                    'id_usuario' => $userId,
                    'id_sesion' => $data['id_sesion'] ?? null,
                    'id_metodo_pago' => $data['id_metodo_pago'],
                    'id_estatus' => $statusId,
                ], 'id_venta');

                foreach ($data['detalles'] as $detalle) {
                    $producto = DB::table('productos')
                        ->where('id_producto', $detalle['producto_id'])
                        ->lockForUpdate()
                        ->first(['id_producto', 'precio_unitario', 'nombre']);

                    $stock = DB::table('stock')
                        ->where('id_tienda', $storeId)
                        ->where('id_producto', $detalle['producto_id'])
                        ->lockForUpdate()
                        ->first();

                    $stockActual = (int) ($stock->stock_actual ?? 0);

                    if ($stockActual < (int) $detalle['cantidad']) {
                        throw new \RuntimeException(
                            sprintf(
                                'Stock insuficiente para %s. Disponible: %d.',
                                $producto->nombre ?? ('producto ' . $detalle['producto_id']),
                                $stockActual
                            )
                        );
                    }

                    DB::table('detalle_ventas')->insert([
                        'venta_id' => $ventaId,
                        'producto_id' => $detalle['producto_id'],
                        'cantidad' => $detalle['cantidad'],
                        'precio_unitario' => $producto->precio_unitario,
                    ]);
                }
            });

            return response()->json([
                'message' => 'Venta registrada correctamente.'
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar la venta.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'No fue posible registrar la venta.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
