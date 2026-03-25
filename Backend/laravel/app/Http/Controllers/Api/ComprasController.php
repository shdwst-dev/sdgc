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
                'CALL pa_registrar_compra(?, ?, ?, ?)',
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

    public function ver(int $idCompra)
    {
        $compra = DB::table('compras as c')
            ->join('proveedores as pr', 'pr.id_proveedor', '=', 'c.id_proveedor')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->where('c.id_compra', $idCompra)
            ->select(
                'c.id_compra',
                'c.fecha_hora',
                'c.id_proveedor',
                'c.id_estatus',
                'pr.razon_social as proveedor',
                'e.nombre as estado'
            )
            ->first();

        if (!$compra) {
            return response()->json([
                'message' => 'La compra no existe.',
            ], 404);
        }

        $detalles = DB::table('detalle_compras as dc')
            ->join('productos as p', 'p.id_producto', '=', 'dc.producto_id')
            ->where('dc.id_compra', $idCompra)
            ->select(
                'dc.producto_id',
                'p.nombre as producto',
                'dc.cantidad',
                'dc.precio_compra'
            )
            ->orderBy('dc.id_detalle_compra')
            ->get()
            ->map(fn ($detalle) => [
                'producto_id' => $detalle->producto_id,
                'producto' => $detalle->producto,
                'cantidad' => (int) $detalle->cantidad,
                'precio_compra' => (float) $detalle->precio_compra,
                'subtotal' => (float) $detalle->cantidad * (float) $detalle->precio_compra,
            ]);

        return response()->json([
            'compra' => [
                'id_compra' => $compra->id_compra,
                'folio' => 'OC-' . str_pad((string) $compra->id_compra, 3, '0', STR_PAD_LEFT),
                'fecha' => $compra->fecha_hora,
                'id_proveedor' => $compra->id_proveedor,
                'proveedor' => $compra->proveedor,
                'id_estatus' => $compra->id_estatus,
                'estado' => $compra->estado,
                'total' => $detalles->sum('subtotal'),
                'detalles' => $detalles->values(),
            ],
        ]);
    }

    public function actualizar(Request $request, int $idCompra)
    {
        $data = $request->validate([
            'id_proveedor' => 'required|integer|exists:proveedores,id_proveedor',
            'id_estatus' => 'required|integer|exists:estatus,id_estatus',
        ]);

        $compraExiste = DB::table('compras')
            ->where('id_compra', $idCompra)
            ->exists();

        if (!$compraExiste) {
            return response()->json([
                'message' => 'La compra no existe.',
            ], 404);
        }

        DB::table('compras')
            ->where('id_compra', $idCompra)
            ->update([
                'id_proveedor' => $data['id_proveedor'],
                'id_estatus' => $data['id_estatus'],
            ]);

        return response()->json([
            'message' => 'Compra actualizada correctamente.',
        ]);
    }

    public function eliminar(int $idCompra)
    {
        $estatusCancelado = DB::table('estatus')
            ->where('nombre', 'Cancelado')
            ->value('id_estatus');

        if (!$estatusCancelado) {
            return response()->json([
                'message' => 'No existe el estatus Cancelado en el sistema.',
            ], 422);
        }

        $compraExiste = DB::table('compras')
            ->where('id_compra', $idCompra)
            ->exists();

        if (!$compraExiste) {
            return response()->json([
                'message' => 'La compra no existe.',
            ], 404);
        }

        DB::table('compras')
            ->where('id_compra', $idCompra)
            ->update([
                'id_estatus' => $estatusCancelado,
            ]);

        return response()->json([
            'message' => 'Compra cancelada correctamente.',
        ]);
    }

    private function buildDetalleCompraArrayLiteral(array $detalles): string
    {
        $rows = array_map(function (array $detalle) {
            $productoId = (int) $detalle['producto_id'];
            $cantidad = (int) $detalle['cantidad'];
            $precioCompra = number_format((float) $detalle['precio_compra'], 2, '.', '');

            return sprintf(
                'ROW(%d,%d,%s)',
                $productoId,
                $cantidad,
                $precioCompra
            );
        }, $detalles);

        return 'ARRAY[' . implode(',', $rows) . ']::detalle_compra_type[]';
    }
}
