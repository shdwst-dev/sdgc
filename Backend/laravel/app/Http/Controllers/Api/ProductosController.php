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
            $idProducto = DB::table('productos')->insertGetId([
                'id_medida' => $data['id_medida'],
                'id_unidad' => $data['id_unidad'],
                'id_subcategoria' => $data['id_subcategoria'],
                'nombre' => $data['nombre'],
                'precio_base' => $data['precio_base'],
                'precio_unitario' => $data['precio_unitario'],
                'codigo_barras' => $data['codigo_barras'] ?? null,
                'imagen_url' => $data['imagen_url'] ?? null,
                'id_estatus' => $data['id_estatus'] ?? 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'message' => 'Producto creado correctamente.',
                'id_producto' => $idProducto,
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
            DB::table('productos')
                ->where('id_producto', $idProducto)
                ->update([
                    'nombre' => $data['nombre'],
                    'precio_base' => $data['precio_base'],
                    'precio_unitario' => $data['precio_unitario'],
                    'codigo_barras' => $data['codigo_barras'] ?? null,
                    'imagen_url' => $data['imagen_url'] ?? null,
                    'id_estatus' => $data['id_estatus'],
                    'updated_at' => now(),
                ]);

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
            DB::table('productos')
                ->where('id_producto', $idProducto)
                ->delete();

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
