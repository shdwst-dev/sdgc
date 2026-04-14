<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class DashboardDataController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $referenceDate = $this->referenceDate('ventas', 'fecha_hora', $assignedStoreId) ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        $ingresosHoy = $this->salesTotalForRange(
            $referenceDate->copy()->startOfDay(),
            $referenceDate->copy()->endOfDay(),
            $assignedStoreId
        );
        $ingresosMes = $this->salesTotalForRange($monthStart, $monthEnd, $assignedStoreId);
        $gastosMes = $this->purchaseTotalForRange($monthStart, $monthEnd, $assignedStoreId);
        $flujoMensual = $this->buildMonthlyFlow($monthStart, $monthEnd, $assignedStoreId);

        return response()->json([
            'periodo_referencia' => [
                'fecha' => $referenceDate->toDateString(),
                'mes' => $referenceDate->translatedFormat('F Y'),
            ],
            'metricas' => [
                'ingresos_hoy' => $ingresosHoy,
                'ingresos_mes' => $ingresosMes,
                'gastos_mes' => $gastosMes,
                'ganancia_mes' => $ingresosMes - $gastosMes,
            ],
            'flujo_mensual' => $flujoMensual,
        ]);
    }

    public function ventasRecientes(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        return response()->json([
            'ventas_recientes' => $this->recentSales(5, $assignedStoreId)->values(),
        ]);
    }

    public function alertasStock(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $limit = max(1, min((int) $request->integer('limit', 5), 50));

        return response()->json([
            'alertas_stock' => $this->stockAlerts($limit, $assignedStoreId)->values(),
        ]);
    }

    public function topProductos(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $referenceDate = $this->referenceDate('ventas', 'fecha_hora', $assignedStoreId) ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $referenceDate->translatedFormat('F Y'),
            ],
            'top_productos' => $this->topProductosForRange($monthStart, $monthEnd, 5, $assignedStoreId)->values(),
        ]);
    }

    public function inventario(Request $request): JsonResponse
    {
        $catalogoGlobal = $request->boolean('catalogo_global');
        $incluirInactivos = $request->boolean('incluir_inactivos');
        $assignedStoreId = $catalogoGlobal ? null : $this->resolveUserStoreId($request);

        $stockPorProducto = DB::table('stock as st')
            ->select('st.id_producto', 'st.id_tienda', 't.nombre as tienda', 'st.stock_actual', 'st.stock_minimo')
            ->join('tiendas as t', 't.id_tienda', '=', 'st.id_tienda')
            ->when($assignedStoreId, fn ($query) => $query->where('st.id_tienda', $assignedStoreId))
            ->orderBy('t.nombre')
            ->get()
            ->groupBy('id_producto');

        $productos = DB::table('productos as p')
            ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
            ->leftJoin('categorias as c', 'c.id_categoria', '=', 's.id_categoria')
            ->leftJoin('stock as st', function ($join) use ($assignedStoreId) {
                $join->on('st.id_producto', '=', 'p.id_producto');
                if ($assignedStoreId) {
                    $join->where('st.id_tienda', '=', $assignedStoreId);
                }
            })
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'p.id_estatus')
            ->when(!$incluirInactivos, fn ($query) => $query->where('e.nombre', '!=', 'Inactivo'))
            ->select(
                'p.id_producto',
                'p.codigo_barras as sku',
                'p.nombre as producto',
                'p.imagen_url',
                'c.nombre as categoria',
                'p.precio_base as costo',
                'p.precio_unitario as precio',
                'e.nombre as estatus',
                DB::raw('COALESCE(SUM(st.stock_actual), 0) as stock'),
                DB::raw('COALESCE(SUM(st.stock_minimo), 0) as minimo')
            )
            ->groupBy(
                'p.id_producto',
                'p.codigo_barras',
                'p.nombre',
                'p.imagen_url',
                'c.nombre',
                'p.precio_base',
                'p.precio_unitario',
                'e.nombre'
            )
            ->orderBy('p.nombre')
            ->get()
            ->map(function ($producto) use ($stockPorProducto) {
                $estadoStock = 'Disponible';
                if ((int) $producto->stock <= 0) {
                    $estadoStock = 'Sin stock';
                } elseif ((int) $producto->stock <= (int) $producto->minimo) {
                    $estadoStock = 'Stock bajo';
                }

                return [
                    'id_producto' => $producto->id_producto,
                    'sku' => $producto->sku,
                    'producto' => $producto->producto,
                    'imagen_url' => $producto->imagen_url,
                    'categoria' => $producto->categoria ?? 'Sin categoría',
                    'stock' => (int) $producto->stock,
                    'minimo' => (int) $producto->minimo,
                    'costo' => (float) $producto->costo,
                    'precio' => (float) $producto->precio,
                    'estatus' => $producto->estatus,
                    'estado' => $estadoStock,
                    'stock_por_tienda' => ($stockPorProducto->get($producto->id_producto) ?? collect())
                        ->map(fn ($stock) => [
                            'id_tienda' => (int) $stock->id_tienda,
                            'tienda' => $stock->tienda,
                            'stock_actual' => (int) $stock->stock_actual,
                            'stock_minimo' => (int) $stock->stock_minimo,
                        ])
                        ->values(),
                ];
            });

        return response()->json([
            'metricas' => [
                'productos_activos' => $productos->where('estatus', 'Activo')->count(),
                'stock_total' => $productos->sum('stock'),
                'alertas_activas' => $productos->where('estado', 'Stock bajo')->count(),
                'valor_inventario' => $productos->sum(fn ($producto) => $producto['stock'] * $producto['costo']),
            ],
            'categorias' => $productos->pluck('categoria')->unique()->values(),
            'catalogos' => [
                'subcategorias' => DB::table('subcategorias as s')
                    ->join('categorias as c', 'c.id_categoria', '=', 's.id_categoria')
                    ->select('s.id_subcategoria', 's.nombre', 'c.nombre as categoria')
                    ->orderBy('c.nombre')
                    ->orderBy('s.nombre')
                    ->get(),
                'medidas' => DB::table('medidas')
                    ->select('id_medida', 'altura', 'ancho', 'peso', 'volumen')
                    ->orderBy('id_medida')
                    ->get(),
                'unidades' => DB::table('unidades_medida')
                    ->select('id_unidad', 'nombre', 'abreviatura')
                    ->orderBy('nombre')
                    ->get(),
                'estatus' => DB::table('estatus')
                    ->select('id_estatus', 'nombre')
                    ->orderBy('id_estatus')
                    ->get(),
                'tiendas' => $this->storesCatalog($assignedStoreId),
            ],
            'productos' => $productos->values(),
        ]);
    }

    public function compras(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $referenceDate = $this->referenceDate('compras', 'fecha_hora', $assignedStoreId) ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        $tiendas = DB::table('tiendas')
            ->select('id_tienda', 'nombre')
            ->when($assignedStoreId, fn ($query) => $query->where('id_tienda', $assignedStoreId))
            ->orderBy('nombre')
            ->get();

        $ordenes = DB::table('compras as c')
            ->join('proveedores as pr', 'pr.id_proveedor', '=', 'c.id_proveedor')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->when($assignedStoreId && $this->tableHasStoreColumn('compras'), fn ($query) => $query->where('c.id_tienda', $assignedStoreId))
            ->select(
                'c.id_compra',
                'c.id_proveedor',
                'c.id_estatus',
                'c.fecha_hora',
                'pr.razon_social as proveedor',
                'e.nombre as estado',
                DB::raw('COALESCE(SUM(dc.cantidad * dc.precio_compra), 0) as total')
            )
            ->groupBy('c.id_compra', 'c.id_proveedor', 'c.id_estatus', 'c.fecha_hora', 'pr.razon_social', 'e.nombre')
            ->orderByDesc('c.fecha_hora')
            ->get()
            ->map(fn ($orden) => [
                'id_compra' => $orden->id_compra,
                'id_proveedor' => $orden->id_proveedor,
                'id_estatus' => $orden->id_estatus,
                'folio' => 'OC-' . str_pad((string) $orden->id_compra, 3, '0', STR_PAD_LEFT),
                'proveedor' => $orden->proveedor,
                'fecha' => Carbon::parse($orden->fecha_hora)->toDateString(),
                'total' => (float) $orden->total,
                'estado' => $orden->estado,
            ]);

        $gastoMes = $this->purchaseTotalForRange($monthStart, $monthEnd, $assignedStoreId);

        return response()->json([
            'periodo_referencia' => [
                'mes' => $referenceDate->translatedFormat('F Y'),
            ],
            'metricas' => [
                'ordenes_mes' => $ordenes->filter(fn ($orden) => str_starts_with($orden['fecha'], $referenceDate->format('Y-m')))->count(),
                'por_recibir' => $ordenes->whereIn('estado', ['Pendiente', 'En Proceso'])->count(),
                'gasto_acumulado' => $gastoMes,
                'proveedores_activos' => DB::table('proveedores as pr')
                    ->leftJoin('compras as c', function ($join) use ($assignedStoreId) {
                        $join->on('c.id_proveedor', '=', 'pr.id_proveedor');

                        if ($assignedStoreId && $this->tableHasStoreColumn('compras')) {
                            $join->where('c.id_tienda', '=', $assignedStoreId);
                        }
                    })
                    ->when($assignedStoreId && $this->tableHasStoreColumn('compras'), fn ($query) => $query->whereNotNull('c.id_compra'))
                    ->count(DB::raw('DISTINCT pr.id_proveedor')),
            ],
            'proveedores' => $ordenes->pluck('proveedor')->unique()->values(),
            'catalogos' => [
                'proveedores' => DB::table('proveedores')
                    ->select('id_proveedor', 'razon_social as nombre')
                    ->orderBy('razon_social')
                    ->get(),
                'productos' => DB::table('productos')
                    ->select('id_producto', 'nombre', 'precio_base')
                    ->orderBy('nombre')
                    ->get()
                    ->map(fn ($producto) => [
                        'id_producto' => $producto->id_producto,
                        'nombre' => $producto->nombre,
                        'precio_base' => (float) $producto->precio_base,
                    ]),
                'tiendas' => $tiendas,
                'estatus' => DB::table('estatus')
                    ->select('id_estatus', 'nombre')
                    ->whereIn('nombre', ['Pendiente', 'Completado', 'Cancelado', 'En Proceso', 'Activo'])
                    ->orderBy('id_estatus')
                    ->get(),
            ],
            'ordenes' => $ordenes->values(),
        ]);
    }

    public function ventas(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $metodosPago = DB::table('metodos_pago')
            ->select('id_metodo_pago', 'nombre')
            ->orderBy('nombre')
            ->get();

        $tiendas = DB::table('tiendas')
            ->select('id_tienda', 'nombre')
            ->when($assignedStoreId, fn ($query) => $query->where('id_tienda', $assignedStoreId))
            ->orderBy('nombre')
            ->get();

        $productosBase = DB::table('productos as p')
            ->join('estatus as e', 'e.id_estatus', '=', 'p.id_estatus')
            ->where('e.nombre', '!=', 'Inactivo')
            ->select(
                'p.id_producto',
                'p.codigo_barras as sku',
                'p.nombre',
                'p.imagen_url',
                'p.precio_unitario as precio'
            )
            ->orderBy('p.nombre')
            ->get();

        $stockRows = DB::table('stock as s')
            ->join('tiendas as t', 't.id_tienda', '=', 's.id_tienda')
            ->when($assignedStoreId, fn ($query) => $query->where('s.id_tienda', $assignedStoreId))
            ->select('s.id_producto', 's.id_tienda', 't.nombre as tienda', 's.stock_actual')
            ->get()
            ->groupBy('id_producto');

        $productos = $productosBase->map(function ($producto) use ($stockRows) {
            $stockPorTienda = ($stockRows->get($producto->id_producto) ?? collect())
                ->map(fn ($stock) => [
                    'id_tienda' => (int) $stock->id_tienda,
                    'tienda' => $stock->tienda,
                    'stock' => (int) $stock->stock_actual,
                ])
                ->values();

            return [
                'id_producto' => $producto->id_producto,
                'sku' => $producto->sku,
                'nombre' => $producto->nombre,
                'imagen' => $producto->imagen_url,
                'precio' => (float) $producto->precio,
                'stock' => $stockPorTienda->sum('stock'),
                'stock_por_tienda' => $stockPorTienda,
            ];
        });

        $ventaPendiente = DB::table('ventas as v')
            ->join('estatus as e', 'e.id_estatus', '=', 'v.id_estatus')
            ->where('e.nombre', 'Pendiente')
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->orderByDesc('v.fecha_hora')
            ->select('v.id_venta', 'v.id_metodo_pago')
            ->first();

        $carrito = collect();
        $resumen = [
            'subtotal' => 0.0,
            'iva' => 0.0,
            'total' => 0.0,
        ];

        if ($ventaPendiente) {
            $carrito = DB::table('detalle_ventas as dv')
                ->join('productos as p', 'p.id_producto', '=', 'dv.producto_id')
                ->where('dv.venta_id', $ventaPendiente->id_venta)
                ->select('p.id_producto', 'p.codigo_barras as sku', 'p.nombre', 'dv.cantidad', 'dv.precio_unitario')
                ->get()
                ->map(function ($item) {
                    $subtotal = (float) $item->cantidad * (float) $item->precio_unitario;

                    return [
                        'producto_id' => (int) $item->id_producto,
                        'sku' => $item->sku,
                        'nombre' => $item->nombre,
                        'precio_unitario' => (float) $item->precio_unitario,
                        'cantidad' => (int) $item->cantidad,
                        'total' => $subtotal,
                        'descuento' => null,
                    ];
                });

            $subtotal = $carrito->sum('total');
            $iva = round($subtotal * 0.10, 2);
            $resumen = [
                'subtotal' => $subtotal,
                'iva' => $iva,
                'total' => $subtotal + $iva,
            ];
        }

        return response()->json([
            'productos' => $productos,
            'catalogos' => [
                'clientes' => DB::table('usuarios as u')
                    ->join('roles as r', 'r.id_rol', '=', 'u.id_rol')
                    ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
                    ->where('r.nombre', 'Comprador')
                    ->select(
                        'u.id_usuario',
                        'u.email',
                        DB::raw("TRIM(CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, ''))) as nombre")
                    )
                    ->orderBy('p.nombre')
                    ->get(),
                'metodos_pago' => $metodosPago,
                'tiendas' => $tiendas,
            ],
            'venta_en_curso' => [
                'cliente' => 'Venta mostrador',
                'cliente_id' => null,
                'id_metodo_pago' => $ventaPendiente->id_metodo_pago ?? $metodosPago->first()->id_metodo_pago ?? null,
                'id_tienda' => $tiendas->first()->id_tienda ?? null,
                'carrito' => $carrito->values(),
                'resumen' => $resumen,
            ],
        ]);
    }

    public function ventasPeriodo(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        [$monthStart, $monthEnd] = $this->resolveReportRange($request, $assignedStoreId);

        $ventasByDay = DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->whereBetween('v.fecha_hora', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->select(
                DB::raw('DATE(v.fecha_hora) as fecha'),
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy(DB::raw('DATE(v.fecha_hora)'))
            ->pluck('total', 'fecha');

        $ventasByMetodo = DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->leftJoin('metodos_pago as mp', 'mp.id_metodo_pago', '=', 'v.id_metodo_pago')
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->whereBetween('v.fecha_hora', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->select(
                DB::raw("COALESCE(mp.nombre, 'Sin método') as metodo_pago"),
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy(DB::raw("COALESCE(mp.nombre, 'Sin método')"))
            ->orderByDesc('total')
            ->get();

        $ventas = DB::table('ventas as v')
            ->join('usuarios as u', 'u.id_usuario', '=', 'v.id_usuario')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('metodos_pago as mp', 'mp.id_metodo_pago', '=', 'v.id_metodo_pago')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->whereBetween('v.fecha_hora', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->select(
                'v.id_venta',
                'v.fecha_hora',
                'v.id_metodo_pago',
                'mp.nombre as metodo_pago',
                DB::raw("CONCAT(p.nombre, ' ', p.apellido_paterno) as responsable"),
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy('v.id_venta', 'v.fecha_hora', 'v.id_metodo_pago', 'mp.nombre', 'p.nombre', 'p.apellido_paterno')
            ->orderByDesc('v.fecha_hora')
            ->limit(20)
            ->get()
            ->map(fn ($venta) => [
                'id_venta' => (int) $venta->id_venta,
                'factura' => 'VTA-' . str_pad((string) $venta->id_venta, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'responsable' => $venta->responsable,
                'monto' => (float) $venta->total,
                'fecha' => Carbon::parse($venta->fecha_hora)->toDateString(),
                'metodo_pago' => $venta->metodo_pago ?? 'Sin método',
            ]);

        $labels = [];
        $ventasDiarias = [];

        foreach (CarbonPeriod::create($monthStart->copy()->startOfDay(), $monthEnd->copy()->startOfDay()) as $day) {
            $dateKey = $day->toDateString();
            $labels[] = $day->format('d M');
            $ventasDiarias[] = (float) ($ventasByDay[$dateKey] ?? 0);
        }

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $this->buildPeriodLabel($monthStart, $monthEnd),
            ],
            'series' => [
                'labels' => $labels,
                'ventas_diarias' => $ventasDiarias,
                'metodos_pago' => $ventasByMetodo->map(fn ($row) => [
                    'nombre' => $row->metodo_pago,
                    'total' => (float) $row->total,
                ])->values(),
            ],
            'totales' => [
                'ventas' => array_sum($ventasDiarias),
                'transacciones' => $ventas->count(),
            ],
            'ventas' => $ventas->values(),
        ]);
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

    public function proveedores(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        $proveedores = DB::table('proveedores as pr')
            ->join('personas as pe', 'pe.id_persona', '=', 'pr.id_persona')
            ->leftJoin('metodos_pago as mp', 'mp.id_metodo_pago', '=', 'pr.id_metodo_pago')
            ->leftJoin('compras as c', function ($join) use ($assignedStoreId) {
                $join->on('c.id_proveedor', '=', 'pr.id_proveedor');

                if ($assignedStoreId && $this->tableHasStoreColumn('compras')) {
                    $join->where('c.id_tienda', '=', $assignedStoreId);
                }
            })
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->select(
                'pr.id_proveedor',
                'pr.razon_social as nombre',
                'pr.razon_social',
                'pr.id_metodo_pago',
                'mp.nombre as metodo_pago',
                'pe.nombre as contacto_nombre',
                'pe.apellido_paterno',
                'pe.apellido_materno',
                'pe.telefono',
                DB::raw("CONCAT(LOWER(REPLACE(pe.nombre, ' ', '.')), '.', LOWER(REPLACE(pe.apellido_paterno, ' ', '')), '@tienda.com') as correo"),
                DB::raw('COUNT(DISTINCT dc.producto_id) as productos'),
                DB::raw('COUNT(DISTINCT c.id_compra) as compras'),
                DB::raw('MAX(c.fecha_hora) as ultimo_pedido')
            )
            ->groupBy(
                'pr.id_proveedor',
                'pr.razon_social',
                'pr.id_metodo_pago',
                'mp.nombre',
                'pe.telefono',
                'pe.nombre',
                'pe.apellido_paterno',
                'pe.apellido_materno'
            )
            ->orderBy('pr.razon_social')
            ->get()
            ->map(fn ($proveedor) => [
                'id_proveedor' => $proveedor->id_proveedor,
                'nombre' => $proveedor->nombre,
                'razon_social' => $proveedor->razon_social,
                'contacto' => trim($proveedor->contacto_nombre . ' ' . $proveedor->apellido_paterno . ' ' . $proveedor->apellido_materno),
                'correo' => $proveedor->correo,
                'telefono' => $proveedor->telefono,
                'id_metodo_pago' => $proveedor->id_metodo_pago,
                'metodo_pago' => $proveedor->metodo_pago,
                'compras' => (int) $proveedor->compras,
                'productos' => (int) $proveedor->productos,
                'ultimo_pedido' => $proveedor->ultimo_pedido ? Carbon::parse($proveedor->ultimo_pedido)->toDateString() : null,
            ]);

        return response()->json([
            'catalogos' => [
                'metodos_pago' => DB::table('metodos_pago')
                    ->select('id_metodo_pago', 'nombre')
                    ->orderBy('nombre')
                    ->get(),
            ],
            'proveedores' => $proveedores,
        ]);
    }

    public function clientes(): JsonResponse
    {
        $clientes = DB::table('usuarios as u')
            ->join('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'u.id_estatus')
            ->where('r.nombre', 'Comprador')
            ->select(
                'u.id_usuario',
                'u.id_estatus',
                'u.email as correo',
                'p.telefono',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'e.nombre as estado'
            )
            ->orderBy('p.nombre')
            ->get()
            ->map(fn ($cliente) => [
                'id_usuario' => $cliente->id_usuario,
                'id_estatus' => $cliente->id_estatus,
                'nombre' => trim($cliente->nombre . ' ' . $cliente->apellido_paterno . ' ' . $cliente->apellido_materno),
                'correo' => $cliente->correo,
                'telefono' => $cliente->telefono,
                'compras' => 0,
                'ultima_compra' => null,
                'estado' => $cliente->estado ?? 'Activo',
            ]);

        return response()->json([
            'catalogos' => [
                'estatus' => DB::table('estatus')
                    ->select('id_estatus', 'nombre')
                    ->orderBy('id_estatus')
                    ->get(),
            ],
            'clientes' => $clientes,
        ]);
    }

    public function facturacion(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        $facturas = DB::table('comprobantes as c')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->select(
                'c.id_comprobante',
                'c.id_venta',
                'c.numero_correlativo',
                'c.fecha_emision',
                'e.nombre as estado',
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy('c.id_comprobante', 'c.id_venta', 'c.numero_correlativo', 'c.fecha_emision', 'e.nombre')
            ->orderByDesc('c.fecha_emision')
            ->get()
            ->map(fn ($factura) => [
                'id_comprobante' => $factura->id_comprobante,
                'id_venta' => $factura->id_venta,
                'registro_venta' => 'VTA-' . str_pad((string) $factura->id_venta, 4, '0', STR_PAD_LEFT),
                'folio' => 'FAC-' . str_pad((string) $factura->numero_correlativo, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'fecha' => Carbon::parse($factura->fecha_emision)->toDateString(),
                'total' => (float) $factura->total,
                'estado' => $factura->estado,
            ]);

        return response()->json([
            'facturas' => $facturas,
        ]);
    }

    public function verFactura(Request $request, int $idComprobante): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        $factura = DB::table('comprobantes as c')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->leftJoin('productos as p', 'p.id_producto', '=', 'dv.producto_id')
            ->where('c.id_comprobante', $idComprobante)
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->select(
                'c.id_comprobante',
                'c.id_venta',
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
                'message' => 'La factura no existe.',
            ], 404);
        }

        $primeraFila = $factura->first();
        $detalles = $factura
            ->filter(fn ($detalle) => $detalle->producto_id !== null)
            ->map(fn ($detalle) => [
                'producto_id' => $detalle->producto_id,
                'producto' => $detalle->producto ?? 'Producto',
                'cantidad' => (int) $detalle->cantidad,
                'precio_unitario' => (float) $detalle->precio_unitario,
                'subtotal' => (float) $detalle->cantidad * (float) $detalle->precio_unitario,
            ])
            ->values();

        return response()->json([
            'factura' => [
                'id_comprobante' => $primeraFila->id_comprobante,
                'id_venta' => $primeraFila->id_venta,
                'registro_venta' => 'VTA-' . str_pad((string) $primeraFila->id_venta, 4, '0', STR_PAD_LEFT),
                'folio' => 'FAC-' . str_pad((string) $primeraFila->numero_correlativo, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'fecha' => Carbon::parse($primeraFila->fecha_emision)->toDateString(),
                'estado' => $primeraFila->estado,
                'total' => (float) $detalles->sum('subtotal'),
                'detalles' => $detalles,
            ],
        ]);
    }

    public function eliminarFactura(Request $request, int $idComprobante): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        $comprobante = DB::table('comprobantes as c')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->where('c.id_comprobante', $idComprobante)
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->select('c.id_comprobante', 'c.id_estatus')
            ->first();

        if (!$comprobante) {
            return response()->json([
                'message' => 'La factura no existe.',
            ], 404);
        }

        $estatusEliminado = DB::table('estatus')
            ->whereIn('nombre', ['Inactivo', 'Cancelado'])
            ->orderByRaw("CASE WHEN nombre = 'Inactivo' THEN 0 ELSE 1 END")
            ->value('id_estatus');

        if (!$estatusEliminado) {
            return response()->json([
                'message' => 'No existe un estatus valido para eliminar la factura.',
            ], 422);
        }

        DB::table('comprobantes')
            ->where('id_comprobante', $idComprobante)
            ->update([
                'id_estatus' => $estatusEliminado,
            ]);

        return response()->json([
            'message' => 'Factura eliminada correctamente.',
        ]);
    }

    public function reportes(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        [$monthStart, $monthEnd] = $this->resolveReportRange($request, $assignedStoreId);

        $ventasTotales = $this->salesTotalForRange($monthStart, $monthEnd, $assignedStoreId);
        $costosTotales = $this->purchaseTotalForRange($monthStart, $monthEnd, $assignedStoreId);
        $facturasPendientes = DB::table('comprobantes as c')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'c.id_venta')
            ->whereIn('e.nombre', ['Pendiente', 'En Proceso'])
            ->whereBetween('c.fecha_emision', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->when($assignedStoreId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $assignedStoreId))
            ->sum(DB::raw('COALESCE(dv.cantidad * dv.precio_unitario, 0)'));
        $flujoPeriodo = $this->buildMonthlyFlow($monthStart, $monthEnd, $assignedStoreId);

        $periodLabel = $monthStart->isSameMonth($monthEnd)
            ? $monthStart->translatedFormat('F Y')
            : sprintf('%s - %s', $monthStart->format('d/m/Y'), $monthEnd->format('d/m/Y'));

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $periodLabel,
            ],
            'metricas' => [
                'ventas_totales' => $ventasTotales,
                'costos_totales' => $costosTotales,
                'utilidad_bruta' => $ventasTotales - $costosTotales,
                'utilidad_neta' => $ventasTotales - $costosTotales,
                'facturas_pendientes' => (float) $facturasPendientes,
            ],
            'flujo_periodo' => $flujoPeriodo,
        ]);
    }

    public function graficaIngresosVsGastos(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        [$monthStart, $monthEnd] = $this->resolveReportRange($request, $assignedStoreId);
        $flujo = $this->buildMonthlyFlow($monthStart, $monthEnd, $assignedStoreId);

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $this->buildPeriodLabel($monthStart, $monthEnd),
            ],
            'series' => [
                'labels' => $flujo['labels'],
                'ingresos' => $flujo['ingresos'],
                'gastos' => $flujo['gastos'],
            ],
            'totales' => [
                'ingresos' => array_sum($flujo['ingresos']),
                'gastos' => array_sum($flujo['gastos']),
            ],
        ]);
    }

    public function graficaProductosMasVendidos(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        [$monthStart, $monthEnd] = $this->resolveReportRange($request, $assignedStoreId);
        $topProductos = $this->topProductosForRange($monthStart, $monthEnd, 10, $assignedStoreId);

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $this->buildPeriodLabel($monthStart, $monthEnd),
            ],
            'series' => [
                'labels' => $topProductos->pluck('nombre')->values(),
                'cantidad' => $topProductos->pluck('cantidad')->values(),
            ],
            'top_productos' => $topProductos->values(),
        ]);
    }

    public function graficaUtilidad(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        [$monthStart, $monthEnd] = $this->resolveReportRange($request, $assignedStoreId);
        $flujo = $this->buildMonthlyFlow($monthStart, $monthEnd, $assignedStoreId);

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $this->buildPeriodLabel($monthStart, $monthEnd),
            ],
            'series' => [
                'labels' => $flujo['labels'],
                'utilidad' => $flujo['utilidad'],
            ],
            'totales' => [
                'ingresos' => array_sum($flujo['ingresos']),
                'gastos' => array_sum($flujo['gastos']),
                'utilidad' => array_sum($flujo['utilidad']),
            ],
        ]);
    }

    public function configuracion(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $isSuperAdmin = $this->isSuperAdmin($request);
        $tienda = $assignedStoreId
            ? DB::table('tiendas as t')
                ->where('t.id_tienda', $assignedStoreId)
                ->select(
                    't.id_tienda',
                    't.nombre'
                )
                ->first()
            : ($isSuperAdmin ? (object) [
                'id_tienda' => null,
                'nombre' => 'Todas las tiendas',
            ] : null);

        $empleados = DB::table('tiendas_empleados as te')
            ->join('usuarios as u', 'u.id_usuario', '=', 'te.id_empleado')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'u.id_estatus')
            ->when($assignedStoreId, fn ($query) => $query->where('te.id_tienda', $assignedStoreId))
            ->select(
                'u.id_usuario',
                'u.email',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'p.telefono',
                'r.nombre as rol',
                'e.nombre as estatus'
            )
            ->orderBy('p.nombre')
            ->orderBy('p.apellido_paterno')
            ->get()
            ->map(fn ($empleado) => [
                'id_usuario' => (int) $empleado->id_usuario,
                'nombre' => trim(($empleado->nombre ?? '') . ' ' . ($empleado->apellido_paterno ?? '') . ' ' . ($empleado->apellido_materno ?? '')),
                'email' => $empleado->email,
                'telefono' => $empleado->telefono,
                'rol' => $empleado->rol ?? 'Sin rol',
                'estatus' => $empleado->estatus ?? 'Sin estatus',
            ]);

        return response()->json([
            'tienda' => [
                'id_tienda' => $tienda->id_tienda ?? null,
                'nombre' => $tienda->nombre ?? '',
            ],
            'empleados' => $empleados->values(),
        ]);
    }

    public function configuracionStats(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        $baseQuery = DB::table('tiendas_empleados as te')
            ->join('usuarios as u', 'u.id_usuario', '=', 'te.id_empleado')
            ->leftJoin('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'u.id_estatus')
            ->when($assignedStoreId, fn ($query) => $query->where('te.id_tienda', $assignedStoreId));

        $porRol = (clone $baseQuery)
            ->select('r.nombre as grupo', DB::raw('COUNT(*) as cantidad'))
            ->groupBy('r.nombre')
            ->orderByDesc('cantidad')
            ->get();

        $porEstatus = (clone $baseQuery)
            ->select('e.nombre as grupo', DB::raw('COUNT(*) as cantidad'))
            ->groupBy('e.nombre')
            ->orderByDesc('cantidad')
            ->get();

        $totalEmpleados = (clone $baseQuery)->count();

        // Formato Google Charts (array de arrays con header)
        $chartPorRol = [['Rol', 'Cantidad']];
        foreach ($porRol as $row) {
            $chartPorRol[] = [$row->grupo ?? 'Sin rol', (int) $row->cantidad];
        }

        $chartPorEstatus = [['Estatus', 'Cantidad']];
        foreach ($porEstatus as $row) {
            $chartPorEstatus[] = [$row->grupo ?? 'Sin estatus', (int) $row->cantidad];
        }

        return response()->json([
            'total_empleados' => $totalEmpleados,
            'empleados_por_rol' => $chartPorRol,
            'empleados_por_estatus' => $chartPorEstatus,
            'resumen_rol' => $porRol->map(fn ($row) => [
                'nombre' => $row->grupo ?? 'Sin rol',
                'cantidad' => (int) $row->cantidad,
            ])->values(),
            'resumen_estatus' => $porEstatus->map(fn ($row) => [
                'nombre' => $row->grupo ?? 'Sin estatus',
                'cantidad' => (int) $row->cantidad,
            ])->values(),
        ]);
    }

    public function verEmpleadoConfiguracion(Request $request, int $idEmpleado): JsonResponse
    {
        $empleado = $this->resolveStoreEmployee($request, $idEmpleado);

        if (!$empleado) {
            return response()->json([
                'message' => 'El empleado no existe en la tienda asignada.',
            ], 404);
        }

        return response()->json([
            'empleado' => $empleado,
            'catalogos' => [
                'roles' => DB::table('roles')
                    ->select('id_rol', 'nombre')
                    ->orderBy('nombre')
                    ->get(),
                'estatus' => DB::table('estatus')
                    ->select('id_estatus', 'nombre')
                    ->orderBy('id_estatus')
                    ->get(),
            ],
        ]);
    }

    public function actualizarEmpleadoConfiguracion(Request $request, int $idEmpleado): JsonResponse
    {
        $empleado = $this->resolveStoreEmployee($request, $idEmpleado, true);

        if (!$empleado) {
            return response()->json([
                'message' => 'El empleado no existe en la tienda asignada.',
            ], 404);
        }

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100'],
            'apellido_paterno' => ['required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'telefono' => [
                'required',
                'string',
                'max:20',
                Rule::unique('personas', 'telefono')->ignore($empleado->id_persona, 'id_persona'),
            ],
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('usuarios', 'email')->ignore($empleado->id_usuario, 'id_usuario'),
            ],
            'id_rol' => ['required', 'integer', 'exists:roles,id_rol'],
            'id_estatus' => ['required', 'integer', 'exists:estatus,id_estatus'],
        ]);

        DB::transaction(function () use ($empleado, $data) {
            DB::table('personas')
                ->where('id_persona', $empleado->id_persona)
                ->update([
                    'nombre' => $data['nombre'],
                    'apellido_paterno' => $data['apellido_paterno'],
                    'apellido_materno' => $data['apellido_materno'] ?? null,
                    'telefono' => $data['telefono'],
                ]);

            DB::table('usuarios')
                ->where('id_usuario', $empleado->id_usuario)
                ->update([
                    'email' => $data['email'],
                    'id_rol' => $data['id_rol'],
                    'id_estatus' => $data['id_estatus'],
                ]);
        });

        return response()->json([
            'message' => 'Empleado actualizado correctamente.',
        ]);
    }

    public function eliminarEmpleadoConfiguracion(Request $request, int $idEmpleado): JsonResponse
    {
        $empleado = $this->resolveStoreEmployee($request, $idEmpleado, true);

        if (!$empleado) {
            return response()->json([
                'message' => 'El empleado no existe en la tienda asignada.',
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

        DB::table('usuarios')
            ->where('id_usuario', $idEmpleado)
            ->update([
                'id_estatus' => $estatusInactivo,
            ]);

        return response()->json([
            'message' => 'Empleado eliminado correctamente.',
        ]);
    }

    public function actualizarConfiguracion(Request $request): JsonResponse
    {
        $assignedStoreId = $this->resolveUserStoreId($request);
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100'],
            'correo' => ['nullable', 'email', 'max:100'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'calle' => ['required', 'string', 'max:100'],
            'numero_exterior' => ['required', 'integer', 'min:1'],
            'numero_interior' => ['nullable', 'integer', 'min:1'],
            'ciudad' => ['required', 'string', 'max:100'],
            'estado' => ['required', 'string', 'max:100'],
            'cp' => ['nullable', 'integer', 'min:0'],
            'rfc' => ['nullable', 'string', 'max:30'],
        ]);

        $tienda = DB::table('tiendas as t')
            ->join('direcciones as d', 'd.id_direccion', '=', 't.id_direccion')
            ->join('calles as ca', 'ca.id_calle', '=', 'd.id_calle')
            ->join('colonias as co', 'co.id_colonia', '=', 'ca.id_colonia')
            ->join('municipios as m', 'm.id_municipio', '=', 'co.id_municipio')
            ->join('estados as es', 'es.id_estado', '=', 'm.id_estado')
            ->when($assignedStoreId, fn ($query) => $query->where('t.id_tienda', $assignedStoreId))
            ->select(
                't.id_tienda',
                't.id_direccion',
                'd.id_calle',
                'ca.id_colonia',
                'co.id_municipio',
                'm.id_estado'
            )
            ->orderBy('t.id_tienda')
            ->first();

        if (!$tienda) {
            return response()->json([
                'message' => 'No existe una tienda configurada para actualizar.',
            ], 404);
        }

        DB::transaction(function () use ($data, $tienda) {
            DB::table('tiendas')
                ->where('id_tienda', $tienda->id_tienda)
                ->update([
                    'nombre' => $data['nombre'],
                    'email' => $data['correo'] ?: null,
                    'telefono' => $data['telefono'] ?: null,
                ]);

            DB::table('direcciones')
                ->where('id_direccion', $tienda->id_direccion)
                ->update([
                    'num_ext' => $data['numero_exterior'],
                    'num_int' => $data['numero_interior'] ?? null,
                ]);

            DB::table('calles')
                ->where('id_calle', $tienda->id_calle)
                ->update([
                    'nombre' => $data['calle'],
                ]);

            DB::table('colonias')
                ->where('id_colonia', $tienda->id_colonia)
                ->update([
                    'cp' => $data['cp'] ?? null,
                ]);

            DB::table('municipios')
                ->where('id_municipio', $tienda->id_municipio)
                ->update([
                    'nombre' => $data['ciudad'],
                ]);

            DB::table('estados')
                ->where('id_estado', $tienda->id_estado)
                ->update([
                    'nombre' => $data['estado'],
                ]);
        });

        return response()->json([
            'message' => 'Configuracion actualizada correctamente.',
        ]);
    }

    protected function referenceDate(string $table, string $column, ?int $storeId = null): ?Carbon
    {
        $query = DB::table($table);

        if ($storeId && $this->tableHasStoreColumn($table)) {
            $query->where('id_tienda', $storeId);
        }

        $date = $query->max($column);

        return $date ? Carbon::parse($date) : null;
    }

    protected function resolveReportRange(Request $request, ?int $storeId = null): array
    {
        $referenceDate = $this->referenceDate('ventas', 'fecha_hora', $storeId) ?? Carbon::now();
        $validated = $request->validate([
            'inicio' => ['nullable', 'date'],
            'fin' => ['nullable', 'date'],
        ]);

        $start = array_key_exists('inicio', $validated) && $validated['inicio']
            ? Carbon::parse($validated['inicio'])->startOfDay()
            : $referenceDate->copy()->startOfMonth();
        $end = array_key_exists('fin', $validated) && $validated['fin']
            ? Carbon::parse($validated['fin'])->endOfDay()
            : $referenceDate->copy()->endOfMonth();

        if ($start->greaterThan($end)) {
            return [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [$start, $end];
    }

    protected function buildPeriodLabel(Carbon $start, Carbon $end): string
    {
        return $start->isSameMonth($end)
            ? $start->translatedFormat('F Y')
            : sprintf('%s - %s', $start->format('d/m/Y'), $end->format('d/m/Y'));
    }

    protected function salesTotalForRange(Carbon $start, Carbon $end, ?int $storeId = null): float
    {
        return (float) DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->whereBetween('v.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->when($storeId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $storeId))
            ->sum(DB::raw('COALESCE(dv.cantidad * dv.precio_unitario, 0)'));
    }

    protected function purchaseTotalForRange(Carbon $start, Carbon $end, ?int $storeId = null): float
    {
        return (float) DB::table('compras as c')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->whereBetween('c.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->when($storeId && $this->tableHasStoreColumn('compras'), fn ($query) => $query->where('c.id_tienda', $storeId))
            ->sum(DB::raw('COALESCE(dc.cantidad * dc.precio_compra, 0)'));
    }

    protected function buildMonthlyFlow(Carbon $start, Carbon $end, ?int $storeId = null): array
    {
        $salesByDay = DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->whereBetween('v.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->when($storeId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $storeId))
            ->select(
                DB::raw('DATE(v.fecha_hora) as fecha'),
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy(DB::raw('DATE(v.fecha_hora)'))
            ->pluck('total', 'fecha');

        $purchasesByDay = DB::table('compras as c')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->whereBetween('c.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->when($storeId && $this->tableHasStoreColumn('compras'), fn ($query) => $query->where('c.id_tienda', $storeId))
            ->select(
                DB::raw('DATE(c.fecha_hora) as fecha'),
                DB::raw('COALESCE(SUM(dc.cantidad * dc.precio_compra), 0) as total')
            )
            ->groupBy(DB::raw('DATE(c.fecha_hora)'))
            ->pluck('total', 'fecha');

        $labels = [];
        $ingresos = [];
        $gastos = [];
        $utilidad = [];

        foreach (CarbonPeriod::create($start->copy()->startOfDay(), $end->copy()->startOfDay()) as $day) {
            $dateKey = $day->toDateString();
            $sales = (float) ($salesByDay[$dateKey] ?? 0);
            $purchase = (float) ($purchasesByDay[$dateKey] ?? 0);

            $labels[] = $day->format('d M');
            $ingresos[] = $sales;
            $gastos[] = $purchase;
            $utilidad[] = $sales - $purchase;
        }

        return [
            'labels' => $labels,
            'ingresos' => $ingresos,
            'gastos' => $gastos,
            'utilidad' => $utilidad,
        ];
    }

    protected function recentSales(int $limit = 5, ?int $storeId = null)
    {
        return DB::table('ventas as v')
            ->leftJoin('comprobantes as c', 'c.id_venta', '=', 'v.id_venta')
            ->join('usuarios as u', 'u.id_usuario', '=', 'v.id_usuario')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->when($storeId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $storeId))
            ->select(
                'v.id_venta',
                DB::raw("COALESCE(c.numero_correlativo, v.id_venta) as factura"),
                DB::raw("CONCAT(p.nombre, ' ', p.apellido_paterno) as responsable"),
                'v.fecha_hora as fecha',
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as monto')
            )
            ->groupBy('v.id_venta', 'c.numero_correlativo', 'p.nombre', 'p.apellido_paterno', 'v.fecha_hora')
            ->orderByDesc('v.fecha_hora')
            ->limit($limit)
            ->get()
            ->map(fn ($venta) => [
                'id_venta' => (int) $venta->id_venta,
                'factura' => 'FAC-' . str_pad((string) $venta->factura, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'responsable' => $venta->responsable,
                'monto' => (float) $venta->monto,
                'fecha' => Carbon::parse($venta->fecha)->toDateString(),
            ]);
    }

    protected function stockAlerts(int $limit = 5, ?int $storeId = null)
    {
        return DB::table('stock as s')
            ->join('productos as pr', 'pr.id_producto', '=', 's.id_producto')
            ->when($storeId, fn ($query) => $query->where('s.id_tienda', $storeId))
            ->select(
                'pr.id_producto',
                'pr.codigo_barras as sku',
                'pr.nombre as producto',
                DB::raw('COALESCE(SUM(s.stock_actual), 0) as actual'),
                DB::raw('COALESCE(SUM(s.stock_minimo), 0) as minimo')
            )
            ->groupBy('pr.id_producto', 'pr.codigo_barras', 'pr.nombre')
            ->havingRaw('COALESCE(SUM(s.stock_actual), 0) = 0 OR (COALESCE(SUM(s.stock_minimo), 0) > 0 AND COALESCE(SUM(s.stock_actual), 0) <= COALESCE(SUM(s.stock_minimo), 0))')
            ->orderByRaw('COALESCE(SUM(s.stock_actual), 0) asc')
            ->limit($limit)
            ->get()
            ->map(fn ($item) => [
                'sku' => $item->sku,
                'producto' => $item->producto,
                'actual' => (int) $item->actual,
                'minimo' => (int) $item->minimo,
            ]);
    }

    protected function topProductosForRange(Carbon $start, Carbon $end, int $limit = 10, ?int $storeId = null)
    {
        return DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'v.id_venta', '=', 'dv.venta_id')
            ->join('productos as p', 'p.id_producto', '=', 'dv.producto_id')
            ->whereBetween('v.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->when($storeId && $this->tableHasStoreColumn('ventas'), fn ($query) => $query->where('v.id_tienda', $storeId))
            ->select(
                'p.nombre',
                DB::raw('SUM(dv.cantidad) as cantidad')
            )
            ->groupBy('p.nombre')
            ->orderByDesc('cantidad')
            ->limit($limit)
            ->get()
            ->map(fn ($producto) => [
                'nombre' => $producto->nombre,
                'cantidad' => (int) $producto->cantidad,
            ]);
    }

    protected function resolveStoreEmployee(Request $request, int $idEmpleado, bool $includeIds = false)
    {
        $assignedStoreId = $this->resolveUserStoreId($request);

        return DB::table('tiendas_empleados as te')
            ->join('usuarios as u', 'u.id_usuario', '=', 'te.id_empleado')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'u.id_estatus')
            ->when($assignedStoreId, fn ($query) => $query->where('te.id_tienda', $assignedStoreId))
            ->where('u.id_usuario', $idEmpleado)
            ->select(
                'u.id_usuario',
                'u.id_persona',
                'u.email',
                'u.id_rol',
                'u.id_estatus',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'p.telefono',
                'r.nombre as rol',
                'e.nombre as estatus'
            )
            ->first();
    }

    protected function tableHasStoreColumn(string $table): bool
    {
        return Schema::hasColumn($table, 'id_tienda');
    }

    protected function storesCatalog(?int $storeId = null)
    {
        return DB::table('tiendas')
            ->select('id_tienda', 'nombre')
            ->when($storeId, fn ($query) => $query->where('id_tienda', $storeId))
            ->orderBy('nombre')
            ->get();
    }
}
