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

        $detalleLiteral = $this->buildDetalleVentaArrayLiteral($data['detalles']);

        try {
            DB::statement(
                'CALL pa_registrar_venta(?, ?, ?, ?, ?, ?)',
                [
                    $data['id_usuario'],
                    $data['id_sesion'] ?? null,
                    $data['id_metodo_pago'],
                    $data['id_tienda'],
                    $detalleLiteral,
                    $data['id_estatus'] ?? 1,
                ]
            );

            return response()->json([
                'message' => 'Venta registrada correctamente.'
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar la venta.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    private function buildDetalleVentaArrayLiteral(array $detalles): string
    {
        $rows = array_map(function (array $detalle) {
            $productoId = (int) $detalle['producto_id'];
            $cantidad = (int) $detalle['cantidad'];

            return sprintf(
                'ROW(%d,%d)',
                $productoId,
                $cantidad
            );
        }, $detalles);

        return 'ARRAY[' . implode(',', $rows) . ']::detalle_venta_type[]';
    }
}
