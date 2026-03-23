<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductosController extends Controller
{
    public function crear(Request $request)
    {
        $data = $request->validate([
            'id_medida' => 'required|integer|exists:medidas,id_medida',
            'id_unidad' => 'required|integer|exists:unidades_medida,id_unidad',
            'id_subcategoria' => 'required|integer|exists:subcategorias,id_subcategoria',
            'nombre' => 'required|string|max:200',
            'precio_base' => 'required|numeric|min:0.01',
            'precio_unitario' => 'required|numeric|min:0.01',
            'codigo_barras' => 'nullable|string|max:50',
            'imagen_url' => 'nullable|string',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::statement(
                'CALL pa_crear_producto(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $data['id_medida'],
                    $data['id_unidad'],
                    $data['id_subcategoria'],
                    $data['nombre'],
                    $data['precio_base'],
                    $data['precio_unitario'],
                    $data['codigo_barras'] ?? null,
                    $data['imagen_url'] ?? null,
                    $data['id_estatus'] ?? 1,
                ]
            );

            return response()->json([
                'message' => 'Producto creado correctamente.'
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible crear el producto.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    public function actualizar(Request $request, int $idProducto)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:200',
            'precio_base' => 'required|numeric|min:0.01',
            'precio_unitario' => 'required|numeric|min:0.01',
            'codigo_barras' => 'nullable|string|max:50',
            'imagen_url' => 'nullable|string',
            'id_estatus' => 'required|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::statement(
                'CALL pa_actualizar_producto(?, ?, ?, ?, ?, ?, ?)',
                [
                    $idProducto,
                    $data['nombre'],
                    $data['precio_base'],
                    $data['precio_unitario'],
                    $data['codigo_barras'] ?? null,
                    $data['imagen_url'] ?? null,
                    $data['id_estatus'],
                ]
            );

            return response()->json([
                'message' => 'Producto actualizado correctamente.'
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible actualizar el producto.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    public function eliminar(int $idProducto)
    {
        try {
            DB::statement('CALL pa_eliminar_producto(?)', [$idProducto]);

            return response()->json([
                'message' => 'Producto eliminado correctamente.'
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible eliminar el producto.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }
}
