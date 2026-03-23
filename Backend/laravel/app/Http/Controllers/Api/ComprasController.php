<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComprasController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'id_proveedor' => 'required|integer|exists:proveedores,id_proveedor',
            'id_tienda' => 'required|integer|exists:tiendas,id_tienda',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id_producto',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_compra' => 'required|numeric|min:0.01',
        ]);

        $detalleLiteral = $this->buildDetalleCompraArrayLiteral($data['detalles']);

        try {
            DB::statement(
                'CALL pa_registrar_compra(?, ?, ?::detalle_compra_type[], ?)',
                [
                    $data['id_proveedor'],
                    $data['id_tienda'],
                    $detalleLiteral,
                    $data['id_estatus'] ?? 1,
                ]
            );

            return response()->json([
                'message' => 'Compra registrada correctamente.'
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar la compra.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    private function buildDetalleCompraArrayLiteral(array $detalles): string
    {
        $rows = array_map(function (array $detalle) {
            $productoId = (int) $detalle['producto_id'];
            $cantidad = (int) $detalle['cantidad'];
            $precioCompra = number_format((float) $detalle['precio_compra'], 2, '.', '');

            return sprintf(
                'ROW(%d,%d,%s)::detalle_compra_type',
                $productoId,
                $cantidad,
                $precioCompra
            );
        }, $detalles);

        return 'ARRAY[' . implode(',', $rows) . ']';
    }
}
