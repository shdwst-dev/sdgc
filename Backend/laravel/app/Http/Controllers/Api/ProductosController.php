<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductosController extends Controller
{
    public function listar()
    {
        try {
            $productos = DB::table('productos as p')
                ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
                ->leftJoin('stock as st', 'st.id_producto', '=', 'p.id_producto')
                ->select(
                    'p.id_producto',
                    'p.nombre',
                    'p.codigo_barras',
                    'p.precio_base',
                    'p.precio_unitario',
                    'p.id_estatus',
                    's.nombre as categoria',
                    DB::raw('COALESCE(SUM(st.stock_actual), 0) as stock_actual'),
                    DB::raw('MIN(st.stock_minimo) as stock_minimo')
                )
                ->groupBy(
                    'p.id_producto',
                    'p.nombre',
                    'p.codigo_barras',
                    'p.precio_base',
                    'p.precio_unitario',
                    'p.id_estatus',
                    's.nombre'
                )
                ->orderBy('p.id_producto', 'desc')
                ->get();

            return response()->json([
                'message' => 'Productos obtenidos correctamente.',
                'data' => $productos,
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible obtener los productos.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

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
                'CALL pa_crear_producto(?::integer, ?::integer, ?::integer, ?::varchar, ?::numeric, ?::numeric, ?::varchar, ?::text, ?::integer)',
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
            'stock' => 'required|integer|min:0',
            'precio_base' => 'required|numeric|min:0.01',
            'precio_unitario' => 'required|numeric|min:0.01',
            'codigo_barras' => 'nullable|string|max:50',
            'imagen_url' => 'nullable|string',
            'id_estatus' => 'required|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::transaction(function () use ($idProducto, $data) {
                DB::statement(
                    'CALL pa_actualizar_producto(?::integer, ?::varchar, ?::numeric, ?::numeric, ?::varchar, ?::text, ?::integer)',
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

                $stockRows = DB::table('stock')
                    ->where('id_producto', $idProducto)
                    ->orderBy('id_stock')
                    ->get(['id_stock']);

                if ($stockRows->isEmpty()) {
                    DB::table('stock')->insert([
                        'id_tienda' => 1,
                        'id_producto' => $idProducto,
                        'stock_minimo' => 0,
                        'stock_actual' => $data['stock'],
                    ]);

                    return;
                }

                $primaryStockId = $stockRows->first()->id_stock;

                DB::table('stock')
                    ->where('id_stock', $primaryStockId)
                    ->update(['stock_actual' => $data['stock']]);

                $secondaryStockIds = $stockRows
                    ->skip(1)
                    ->pluck('id_stock');

                if ($secondaryStockIds->isNotEmpty()) {
                    DB::table('stock')
                        ->whereIn('id_stock', $secondaryStockIds)
                        ->update(['stock_actual' => 0]);
                }
            });

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
            $productoExiste = DB::table('productos')
                ->where('id_producto', $idProducto)
                ->exists();

            if (!$productoExiste) {
                return response()->json([
                    'message' => 'El producto no existe.',
                ], 404);
            }

            $estatusInactivo = DB::table('estatus')
                ->where('nombre', 'Inactivo')
                ->value('id_estatus');

            if (!$estatusInactivo) {
                return response()->json([
                    'message' => 'No existe el estatus Inactivo en el sistema.',
                ], 422);
            }

            DB::table('productos')
                ->where('id_producto', $idProducto)
                ->update([
                    'id_estatus' => $estatusInactivo,
                ]);

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

    public function actualizarStockTienda(Request $request, int $idProducto)
    {
        $data = $request->validate([
            'id_tienda' => 'required|integer|exists:tiendas,id_tienda',
            'stock_actual' => 'required|integer|min:0',
            'stock_minimo' => 'required|integer|min:0',
        ]);

        $productoExiste = DB::table('productos')
            ->where('id_producto', $idProducto)
            ->exists();

        if (!$productoExiste) {
            return response()->json([
                'message' => 'El producto no existe.',
            ], 404);
        }

        DB::transaction(function () use ($idProducto, $data) {
            $stockExistente = DB::table('stock')
                ->where('id_producto', $idProducto)
                ->where('id_tienda', $data['id_tienda'])
                ->lockForUpdate()
                ->first();

            if ($stockExistente) {
                DB::table('stock')
                    ->where('id_stock', $stockExistente->id_stock)
                    ->update([
                        'stock_actual' => $data['stock_actual'],
                        'stock_minimo' => $data['stock_minimo'],
                    ]);

                return;
            }

            DB::table('stock')->insert([
                'id_tienda' => $data['id_tienda'],
                'id_producto' => $idProducto,
                'stock_actual' => $data['stock_actual'],
                'stock_minimo' => $data['stock_minimo'],
            ]);
        });

        return response()->json([
            'message' => 'Stock por tienda actualizado correctamente.'
        ]);
    }
    public function leer(int $idProducto)
    {
        try {
            $producto = DB::table('productos as p')
                ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
                ->leftJoin('stock as st', 'st.id_producto', '=', 'p.id_producto')
                ->select(
                    'p.id_producto',
                    'p.nombre',
                    'p.codigo_barras',
                    'p.precio_base',
                    'p.precio_unitario',
                    'p.id_estatus',
                    's.nombre as categoria',
                    DB::raw('COALESCE(SUM(st.stock_actual), 0) as stock_actual'),
                    DB::raw('MIN(st.stock_minimo) as stock_minimo')
                )
                ->where('p.id_producto', $idProducto)
                ->groupBy(
                    'p.id_producto',
                    'p.nombre',
                    'p.codigo_barras',
                    'p.precio_base',
                    'p.precio_unitario',
                    'p.id_estatus',
                    's.nombre'
                )
                ->first();

            if (!$producto) {
                return response()->json([
                    'message' => 'Producto no encontrado.',
                ], 404);
            }

            return response()->json([
                'message' => 'Producto leido correctamente.',
                'data' => $producto,
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible leer el producto.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }
}
