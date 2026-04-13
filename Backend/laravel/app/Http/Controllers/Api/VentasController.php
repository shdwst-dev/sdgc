<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Throwable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Carbon\Carbon;

class VentasController extends Controller
{
    public function historial(Request $request)
    {
        $userId = $request->user()?->id_usuario;

        if (!$userId) {
            return response()->json([
                'message' => 'No fue posible identificar al usuario actual.',
            ], 422);
        }

        $ventas = DB::table('ventas as v')
            ->leftJoin('metodos_pago as mp', 'mp.id_metodo_pago', '=', 'v.id_metodo_pago')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'v.id_estatus')
            ->leftJoin('tiendas as t', 't.id_tienda', '=', 'v.id_tienda')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->where('v.id_usuario', $userId)
            ->select(
                'v.id_venta',
                'v.fecha_hora',
                'mp.nombre as metodo_pago',
                'e.nombre as estado',
                't.nombre as tienda',
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total'),
                DB::raw('COALESCE(SUM(dv.cantidad), 0) as articulos')
            )
            ->groupBy('v.id_venta', 'v.fecha_hora', 'mp.nombre', 'e.nombre', 't.nombre')
            ->orderByDesc('v.fecha_hora')
            ->get();

        $detalles = DB::table('detalle_ventas as dv')
            ->join('productos as p', 'p.id_producto', '=', 'dv.producto_id')
            ->whereIn('dv.venta_id', $ventas->pluck('id_venta'))
            ->select(
                'dv.venta_id',
                'dv.producto_id',
                'dv.cantidad',
                'dv.precio_unitario',
                'p.nombre'
            )
            ->orderBy('dv.venta_id')
            ->orderBy('dv.id_detalle_venta')
            ->get()
            ->groupBy('venta_id');

        return response()->json([
            'compras' => $ventas->map(fn ($venta) => [
                'id_venta' => (int) $venta->id_venta,
                'folio' => 'PED-' . str_pad((string) $venta->id_venta, 4, '0', STR_PAD_LEFT),
                'fecha' => $venta->fecha_hora,
                'metodo_pago' => $venta->metodo_pago ?? 'Sin método',
                'estado' => $venta->estado ?? 'Sin estado',
                'tienda' => $venta->tienda,
                'articulos' => (int) $venta->articulos,
                'total' => (float) $venta->total,
                'detalles' => ($detalles->get($venta->id_venta) ?? collect())
                    ->map(fn ($detalle) => [
                        'producto_id' => (int) $detalle->producto_id,
                        'nombre' => $detalle->nombre,
                        'cantidad' => (int) $detalle->cantidad,
                        'precio_unitario' => (float) $detalle->precio_unitario,
                        'subtotal' => (float) $detalle->cantidad * (float) $detalle->precio_unitario,
                    ])
                    ->values(),
            ])->values(),
        ]);
    }

    public function factura(Request $request, int $idVenta)
    {
        $userId = $request->user()?->id_usuario;

        if (!$userId) {
            return response()->json([
                'message' => 'No fue posible identificar al usuario actual.',
            ], 422);
        }

        $factura = DB::table('comprobantes as c')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->leftJoin('productos as p', 'p.id_producto', '=', 'dv.producto_id')
            ->where('v.id_venta', $idVenta)
            ->where('v.id_usuario', $userId)
            ->select(
                'c.id_comprobante',
                'c.numero_correlativo',
                'c.fecha_emision',
                'e.nombre as estado',
                'dv.producto_id',
                'p.nombre as producto',
                'dv.cantidad',
                'dv.precio_unitario'
            )
            ->orderBy('dv.id_detalle_venta')
            ->get();

        if ($factura->isEmpty()) {
            return response()->json([
                'message' => 'La factura no existe o no pertenece al usuario actual.',
            ], 404);
        }

        $primeraFila = $factura->first();
        $detalles = $factura
            ->filter(fn ($detalle) => $detalle->producto_id !== null)
            ->map(fn ($detalle) => [
                'producto_id' => (int) $detalle->producto_id,
                'producto' => $detalle->producto ?? 'Producto',
                'cantidad' => (int) $detalle->cantidad,
                'precio_unitario' => (float) $detalle->precio_unitario,
                'subtotal' => (float) $detalle->cantidad * (float) $detalle->precio_unitario,
            ])
            ->values();

        return response()->json([
            'factura' => [
                'id_comprobante' => (int) $primeraFila->id_comprobante,
                'id_venta' => $idVenta,
                'folio' => 'FAC-' . str_pad((string) $primeraFila->numero_correlativo, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'fecha' => Carbon::parse($primeraFila->fecha_emision)->toDateString(),
                'estado' => $primeraFila->estado,
                'total' => (float) $detalles->sum('subtotal'),
                'detalles' => $detalles,
            ],
        ]);
    }

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
        $storeId = $this->resolveSaleStoreId($request, $data['detalles'], $userId, $data['id_tienda'] ?? null);
        $statusId = $data['id_estatus'] ?? DB::table('estatus')->where('nombre', 'Completado')->value('id_estatus') ?? 1;

        if (!$userId) {
            return response()->json([
                'message' => 'No fue posible identificar al usuario que registra la venta.',
            ], 422);
        }

        if (!$storeId) {
            return response()->json([
                'message' => 'No existe una tienda con stock suficiente para registrar la venta.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($data, $userId, $storeId, $statusId) {
                DB::statement('SELECT set_config(?, ?, false)', [
                    'app.id_tienda',
                    (string) $storeId,
                ]);

                $ventaData = [
                    'id_usuario' => $userId,
                    'id_sesion' => $data['id_sesion'] ?? null,
                    'id_metodo_pago' => $data['id_metodo_pago'],
                    'id_estatus' => $statusId,
                ];

                if (Schema::hasColumn('ventas', 'id_tienda')) {
                    $ventaData['id_tienda'] = $storeId;
                }

                $ventaId = DB::table('ventas')->insertGetId($ventaData, 'id_venta');

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

                $estatusComprobante = DB::table('estatus')
                    ->where('nombre', 'Activo')
                    ->value('id_estatus') ?? 1;

                $siguienteCorrelativo = ((int) DB::table('comprobantes')->max('numero_correlativo')) + 1;

                if ($siguienteCorrelativo <= 0) {
                    $siguienteCorrelativo = 1000;
                }

                DB::table('comprobantes')->insert([
                    'id_venta' => $ventaId,
                    'id_estatus' => $estatusComprobante,
                    'codigo_hash' => hash('sha256', $ventaId . '|' . Str::uuid()->toString() . '|' . now()->timestamp),
                    'numero_correlativo' => $siguienteCorrelativo,
                    'fecha_emision' => now(),
                ]);
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

    private function resolveSaleStoreId(Request $request, array $detalles, ?int $userId = null, ?int $requestedStoreId = null): ?int
    {
        if ($requestedStoreId && $this->storeCanFulfillDetails($requestedStoreId, $detalles)) {
            return $requestedStoreId;
        }

        $assignedStoreId = $this->resolveUserStoreId($request, $userId);

        if ($assignedStoreId && $this->storeCanFulfillDetails($assignedStoreId, $detalles)) {
            return $assignedStoreId;
        }

        $candidateStoreId = DB::table('stock')
            ->select('id_tienda')
            ->distinct()
            ->orderBy('id_tienda')
            ->pluck('id_tienda');

        foreach ($candidateStoreId as $storeId) {
            if ($this->storeCanFulfillDetails((int) $storeId, $detalles)) {
                return (int) $storeId;
            }
        }

        return null;
    }

    private function resolveUserStoreId(Request $request, ?int $userId = null): ?int
    {
        $resolvedUserId = $request->user()?->id_usuario ?? $userId;

        if (!$resolvedUserId) {
            return null;
        }

        if ($this->isSuperAdmin($request)) {
            return null;
        }

        $storeId = DB::table('tiendas_empleados')
            ->where('id_empleado', $resolvedUserId)
            ->value('id_tienda');

        return $storeId ? (int) $storeId : null;
    }

    private function storeCanFulfillDetails(int $storeId, array $detalles): bool
    {
        $requiredByProduct = collect($detalles)
            ->groupBy('producto_id')
            ->map(fn ($items) => $items->sum(fn ($item) => (int) $item['cantidad']));

        foreach ($requiredByProduct as $productId => $requiredQuantity) {
            $availableQuantity = (int) DB::table('stock')
                ->where('id_tienda', $storeId)
                ->where('id_producto', $productId)
                ->value('stock_actual');

            if ($availableQuantity < $requiredQuantity) {
                return false;
            }
        }

        return true;
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
