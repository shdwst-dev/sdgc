<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductosController extends Controller
{
    public function listar(Request $request)
    {
        try {
            $storeId = $this->resolveUserStoreId($request);

            $productos = DB::table('productos as p')
                ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
                ->when(
                    $storeId,
                    fn ($query) => $query->join('stock as st', function ($join) use ($storeId) {
                        $join->on('st.id_producto', '=', 'p.id_producto')
                            ->where('st.id_tienda', '=', $storeId);
                    }),
                    fn ($query) => $query->leftJoin('stock as st', 'st.id_producto', '=', 'p.id_producto')
                )
                ->select(
                    'p.id_producto',
                    'p.id_subcategoria',
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
                    'p.id_subcategoria',
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
            'id_tienda' => 'nullable|integer|exists:tiendas,id_tienda',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::transaction(function () use ($request, $data) {
                $idProducto = DB::table('productos')->insertGetId([
                    'id_medida' => $data['id_medida'],
                    'id_unidad' => $data['id_unidad'],
                    'id_subcategoria' => $data['id_subcategoria'],
                    'nombre' => $data['nombre'],
                    'id_estatus' => $data['id_estatus'] ?? 1,
                    'precio_base' => $data['precio_base'],
                    'precio_unitario' => $data['precio_unitario'],
                    'codigo_barras' => $data['codigo_barras'] ?? null,
                    'imagen_url' => $data['imagen_url'] ?? null,
                ], 'id_producto');

                $storeId = array_key_exists('id_tienda', $data) && $data['id_tienda'] !== null
                    ? (int) $data['id_tienda']
                    : $this->resolveUserStoreId($request);

                // Para usuarios de tienda, crear fila de stock para que el producto sea visible en su inventario.
                if ($storeId) {
                    DB::table('stock')->updateOrInsert(
                        [
                            'id_tienda' => $storeId,
                            'id_producto' => $idProducto,
                        ],
                        [
                            'stock_minimo' => 0,
                            'stock_actual' => 0,
                        ]
                    );
                }
            });

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
            'stock_minimo' => 'nullable|integer|min:0',
            'precio_base' => 'required|numeric|min:0.01',
            'precio_unitario' => 'required|numeric|min:0.01',
            'codigo_barras' => 'nullable|string|max:50',
            'imagen_url' => 'nullable|string',
            'id_subcategoria' => 'nullable|integer|exists:subcategorias,id_subcategoria',
            'id_tienda' => 'nullable|integer|exists:tiendas,id_tienda',
            'id_estatus' => 'required|integer|exists:estatus,id_estatus',
        ]);

        $productoExiste = DB::table('productos')
            ->where('id_producto', $idProducto)
            ->exists();

        if (!$productoExiste) {
            return response()->json([
                'message' => 'El producto no existe.',
            ], 404);
        }

        try {
            $storeId = array_key_exists('id_tienda', $data) && $data['id_tienda'] !== null
                ? (int) $data['id_tienda']
                : $this->resolveUserStoreId($request);

            DB::transaction(function () use ($idProducto, $data, $storeId) {
                $productUpdate = [
                    'nombre' => $data['nombre'],
                    'precio_base' => $data['precio_base'],
                    'precio_unitario' => $data['precio_unitario'],
                    'codigo_barras' => $data['codigo_barras'] ?? null,
                    'imagen_url' => $data['imagen_url'] ?? null,
                    'id_estatus' => $data['id_estatus'],
                ];

                if (array_key_exists('id_subcategoria', $data) && $data['id_subcategoria']) {
                    $productUpdate['id_subcategoria'] = $data['id_subcategoria'];
                }

                DB::table('productos')
                    ->where('id_producto', $idProducto)
                    ->update($productUpdate);

                $stockMinimoProvided = array_key_exists('stock_minimo', $data) && $data['stock_minimo'] !== null;

                if ($storeId) {
                    $storeStock = DB::table('stock')
                        ->where('id_tienda', $storeId)
                        ->where('id_producto', $idProducto)
                        ->first(['id_stock', 'stock_minimo']);

                    if ($storeStock) {
                        $stockPayload = ['stock_actual' => $data['stock']];

                        if ($stockMinimoProvided) {
                            $stockPayload['stock_minimo'] = $data['stock_minimo'];
                        }

                        DB::table('stock')
                            ->where('id_stock', $storeStock->id_stock)
                            ->update($stockPayload);
                    } else {
                        DB::table('stock')->insert([
                            'id_tienda' => $storeId,
                            'id_producto' => $idProducto,
                            'stock_actual' => $data['stock'],
                            'stock_minimo' => $stockMinimoProvided ? $data['stock_minimo'] : 0,
                        ]);
                    }

                    return;
                }

                $stockRows = DB::table('stock')
                    ->where('id_producto', $idProducto)
                    ->orderBy('id_stock')
                    ->get(['id_stock']);

                if ($stockRows->isEmpty()) {
                    DB::table('stock')->insert([
                        'id_tienda' => $storeId ?: 1,
                        'id_producto' => $idProducto,
                        'stock_minimo' => $stockMinimoProvided ? $data['stock_minimo'] : 0,
                        'stock_actual' => $data['stock'],
                    ]);

                    return;
                }

                $primaryStockId = $stockRows->first()->id_stock;

                $stockPayload = ['stock_actual' => $data['stock']];

                if ($stockMinimoProvided) {
                    $stockPayload['stock_minimo'] = $data['stock_minimo'];
                }

                DB::table('stock')
                    ->where('id_stock', $primaryStockId)
                    ->update($stockPayload);

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
    public function leer(Request $request, int $idProducto)
    {
        try {
            $storeId = $this->resolveUserStoreId($request);

            $producto = DB::table('productos as p')
                ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
                ->when(
                    $storeId,
                    fn ($query) => $query->join('stock as st', function ($join) use ($storeId) {
                        $join->on('st.id_producto', '=', 'p.id_producto')
                            ->where('st.id_tienda', '=', $storeId);
                    }),
                    fn ($query) => $query->leftJoin('stock as st', 'st.id_producto', '=', 'p.id_producto')
                )
                ->select(
                    'p.id_producto',
                    'p.id_subcategoria',
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
                    'p.id_subcategoria',
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

    private function resolveUserStoreId(Request $request): ?int
    {
        $userId = $request->user()?->id_usuario;

        if (!$userId) {
            return null;
        }

        if ($this->isSuperAdmin($request)) {
            return null;
        }

        $storeId = DB::table('tiendas_empleados')
            ->where('id_empleado', $userId)
            ->value('id_tienda');

        return $storeId ? (int) $storeId : null;
    }

    private function isSuperAdmin(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        $roleName = $user->rol?->nombre;

        if (!$roleName && $user->id_rol) {
            $roleName = DB::table('roles')
                ->where('id_rol', $user->id_rol)
                ->value('nombre');
        }

        return $roleName === 'Super Admin';
    }
}
