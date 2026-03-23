<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardDataController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $referenceDate = $this->referenceDate('ventas', 'fecha_hora') ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        $ingresosHoy = $this->salesTotalForRange(
            $referenceDate->copy()->startOfDay(),
            $referenceDate->copy()->endOfDay()
        );
        $ingresosMes = $this->salesTotalForRange($monthStart, $monthEnd);
        $gastosMes = $this->purchaseTotalForRange($monthStart, $monthEnd);
        $flujoMensual = $this->buildMonthlyFlow($monthStart, $monthEnd);

        $ventasRecientes = DB::table('ventas as v')
            ->leftJoin('comprobantes as c', 'c.id_venta', '=', 'v.id_venta')
            ->join('usuarios as u', 'u.id_usuario', '=', 'v.id_usuario')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->select(
                DB::raw("COALESCE(c.numero_correlativo, v.id_venta) as factura"),
                DB::raw("CONCAT(p.nombre, ' ', p.apellido_paterno) as responsable"),
                'v.fecha_hora as fecha',
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as monto')
            )
            ->groupBy('v.id_venta', 'c.numero_correlativo', 'p.nombre', 'p.apellido_paterno', 'v.fecha_hora')
            ->orderByDesc('v.fecha_hora')
            ->limit(5)
            ->get()
            ->map(fn ($venta) => [
                'factura' => 'FAC-' . str_pad((string) $venta->factura, 4, '0', STR_PAD_LEFT),
                'cliente' => 'Venta mostrador',
                'responsable' => $venta->responsable,
                'monto' => (float) $venta->monto,
                'fecha' => Carbon::parse($venta->fecha)->toDateString(),
            ]);

        $alertasStock = DB::table('stock as s')
            ->join('productos as pr', 'pr.id_producto', '=', 's.id_producto')
            ->select(
                'pr.codigo_barras as sku',
                'pr.nombre as producto',
                's.stock_actual as actual',
                's.stock_minimo as minimo'
            )
            ->whereColumn('s.stock_actual', '<=', 's.stock_minimo')
            ->orderBy('s.stock_actual')
            ->limit(5)
            ->get();

        $topProductos = DB::table('detalle_ventas as dv')
            ->join('ventas as v', 'v.id_venta', '=', 'dv.venta_id')
            ->join('productos as p', 'p.id_producto', '=', 'dv.producto_id')
            ->whereBetween('v.fecha_hora', [$monthStart->toDateTimeString(), $monthEnd->toDateTimeString()])
            ->select(
                'p.nombre',
                DB::raw('SUM(dv.cantidad) as cantidad')
            )
            ->groupBy('p.nombre')
            ->orderByDesc('cantidad')
            ->limit(5)
            ->get()
            ->map(fn ($producto) => [
                'nombre' => $producto->nombre,
                'cantidad' => (int) $producto->cantidad,
            ]);

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
            'top_productos' => $topProductos,
            'ventas_recientes' => $ventasRecientes,
            'alertas_stock' => $alertasStock,
        ]);
    }

    public function inventario(): JsonResponse
    {
        $productos = DB::table('productos as p')
            ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
            ->leftJoin('categorias as c', 'c.id_categoria', '=', 's.id_categoria')
            ->leftJoin('stock as st', 'st.id_producto', '=', 'p.id_producto')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'p.id_estatus')
            ->select(
                'p.id_producto',
                'p.codigo_barras as sku',
                'p.nombre as producto',
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
                'c.nombre',
                'p.precio_base',
                'p.precio_unitario',
                'e.nombre'
            )
            ->orderBy('p.nombre')
            ->get()
            ->map(function ($producto) {
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
                    'categoria' => $producto->categoria ?? 'Sin categoría',
                    'stock' => (int) $producto->stock,
                    'minimo' => (int) $producto->minimo,
                    'costo' => (float) $producto->costo,
                    'precio' => (float) $producto->precio,
                    'estatus' => $producto->estatus,
                    'estado' => $estadoStock,
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
            'productos' => $productos->values(),
        ]);
    }

    public function compras(): JsonResponse
    {
        $referenceDate = $this->referenceDate('compras', 'fecha_hora') ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        $ordenes = DB::table('compras as c')
            ->join('proveedores as pr', 'pr.id_proveedor', '=', 'c.id_proveedor')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->select(
                'c.id_compra',
                'c.fecha_hora',
                'pr.razon_social as proveedor',
                'e.nombre as estado',
                DB::raw('COALESCE(SUM(dc.cantidad * dc.precio_compra), 0) as total')
            )
            ->groupBy('c.id_compra', 'c.fecha_hora', 'pr.razon_social', 'e.nombre')
            ->orderByDesc('c.fecha_hora')
            ->get()
            ->map(fn ($orden) => [
                'folio' => 'OC-' . str_pad((string) $orden->id_compra, 3, '0', STR_PAD_LEFT),
                'proveedor' => $orden->proveedor,
                'fecha' => Carbon::parse($orden->fecha_hora)->toDateString(),
                'total' => (float) $orden->total,
                'estado' => $orden->estado,
            ]);

        $gastoMes = $this->purchaseTotalForRange($monthStart, $monthEnd);

        return response()->json([
            'periodo_referencia' => [
                'mes' => $referenceDate->translatedFormat('F Y'),
            ],
            'metricas' => [
                'ordenes_mes' => $ordenes->filter(fn ($orden) => str_starts_with($orden['fecha'], $referenceDate->format('Y-m')))->count(),
                'por_recibir' => $ordenes->whereIn('estado', ['Pendiente', 'En Proceso'])->count(),
                'gasto_acumulado' => $gastoMes,
                'proveedores_activos' => DB::table('proveedores')->count(),
            ],
            'proveedores' => $ordenes->pluck('proveedor')->unique()->values(),
            'ordenes' => $ordenes->values(),
        ]);
    }

    public function ventas(): JsonResponse
    {
        $productos = DB::table('productos as p')
            ->leftJoin('stock as s', 's.id_producto', '=', 'p.id_producto')
            ->select(
                'p.id_producto',
                'p.codigo_barras as sku',
                'p.nombre',
                'p.imagen_url',
                'p.precio_unitario as precio',
                DB::raw('COALESCE(SUM(s.stock_actual), 0) as stock')
            )
            ->groupBy('p.id_producto', 'p.codigo_barras', 'p.nombre', 'p.imagen_url', 'p.precio_unitario')
            ->orderBy('p.nombre')
            ->get()
            ->map(fn ($producto) => [
                'id_producto' => $producto->id_producto,
                'sku' => $producto->sku,
                'nombre' => $producto->nombre,
                'imagen' => $producto->imagen_url,
                'precio' => (float) $producto->precio,
                'stock' => (int) $producto->stock,
            ]);

        $ventaPendiente = DB::table('ventas as v')
            ->join('estatus as e', 'e.id_estatus', '=', 'v.id_estatus')
            ->where('e.nombre', 'Pendiente')
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
                ->select('p.nombre', 'dv.cantidad', 'dv.precio_unitario')
                ->get()
                ->map(function ($item) {
                    $subtotal = (float) $item->cantidad * (float) $item->precio_unitario;

                    return [
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
            'metodos_pago' => DB::table('metodos_pago')->orderBy('nombre')->pluck('nombre'),
            'venta_en_curso' => [
                'cliente' => 'Venta mostrador',
                'metodo_pago' => DB::table('metodos_pago')
                    ->where('id_metodo_pago', $ventaPendiente->id_metodo_pago ?? 1)
                    ->value('nombre') ?? 'Efectivo',
                'carrito' => $carrito->values(),
                'resumen' => $resumen,
            ],
        ]);
    }

    public function proveedores(): JsonResponse
    {
        $proveedores = DB::table('proveedores as pr')
            ->join('personas as pe', 'pe.id_persona', '=', 'pr.id_persona')
            ->leftJoin('compras as c', 'c.id_proveedor', '=', 'pr.id_proveedor')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->select(
                'pr.id_proveedor',
                'pr.razon_social as nombre',
                'pe.telefono',
                DB::raw("CONCAT(LOWER(REPLACE(pe.nombre, ' ', '.')), '.', LOWER(REPLACE(pe.apellido_paterno, ' ', '')), '@tienda.com') as correo"),
                DB::raw('COUNT(DISTINCT dc.producto_id) as productos'),
                DB::raw('MAX(c.fecha_hora) as ultimo_pedido')
            )
            ->groupBy('pr.id_proveedor', 'pr.razon_social', 'pe.telefono', 'pe.nombre', 'pe.apellido_paterno')
            ->orderBy('pr.razon_social')
            ->get()
            ->map(fn ($proveedor) => [
                'nombre' => $proveedor->nombre,
                'correo' => $proveedor->correo,
                'telefono' => $proveedor->telefono,
                'productos' => (int) $proveedor->productos,
                'ultimo_pedido' => $proveedor->ultimo_pedido ? Carbon::parse($proveedor->ultimo_pedido)->toDateString() : null,
            ]);

        return response()->json([
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
                'nombre' => trim($cliente->nombre . ' ' . $cliente->apellido_paterno . ' ' . $cliente->apellido_materno),
                'correo' => $cliente->correo,
                'telefono' => $cliente->telefono,
                'compras' => 0,
                'ultima_compra' => null,
                'estado' => $cliente->estado ?? 'Activo',
            ]);

        return response()->json([
            'clientes' => $clientes,
        ]);
    }

    public function facturacion(): JsonResponse
    {
        $facturas = DB::table('comprobantes as c')
            ->join('ventas as v', 'v.id_venta', '=', 'c.id_venta')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->select(
                'c.numero_correlativo',
                'c.fecha_emision',
                'e.nombre as estado',
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy('c.numero_correlativo', 'c.fecha_emision', 'e.nombre')
            ->orderByDesc('c.fecha_emision')
            ->get()
            ->map(fn ($factura) => [
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

    public function reportes(): JsonResponse
    {
        $referenceDate = $this->referenceDate('ventas', 'fecha_hora') ?? Carbon::now();
        $monthStart = $referenceDate->copy()->startOfMonth();
        $monthEnd = $referenceDate->copy()->endOfMonth();

        $ventasTotales = $this->salesTotalForRange($monthStart, $monthEnd);
        $costosTotales = $this->purchaseTotalForRange($monthStart, $monthEnd);
        $facturasPendientes = DB::table('comprobantes as c')
            ->join('estatus as e', 'e.id_estatus', '=', 'c.id_estatus')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'c.id_venta')
            ->whereIn('e.nombre', ['Pendiente', 'En Proceso'])
            ->sum(DB::raw('COALESCE(dv.cantidad * dv.precio_unitario, 0)'));
        $flujoPeriodo = $this->buildMonthlyFlow($monthStart, $monthEnd);

        return response()->json([
            'periodo_referencia' => [
                'inicio' => $monthStart->toDateString(),
                'fin' => $monthEnd->toDateString(),
                'mes' => $referenceDate->translatedFormat('F Y'),
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

    public function configuracion(): JsonResponse
    {
        $tienda = DB::table('tiendas as t')
            ->leftJoin('direcciones as d', 'd.id_direccion', '=', 't.id_direccion')
            ->leftJoin('calles as ca', 'ca.id_calle', '=', 'd.id_calle')
            ->leftJoin('colonias as co', 'co.id_colonia', '=', 'ca.id_colonia')
            ->leftJoin('municipios as m', 'm.id_municipio', '=', 'co.id_municipio')
            ->leftJoin('estados as es', 'es.id_estado', '=', 'm.id_estado')
            ->select(
                't.nombre',
                't.email',
                't.telefono',
                'd.num_ext',
                'd.num_int',
                'ca.nombre as calle',
                'co.cp',
                'm.nombre as ciudad',
                'es.nombre as estado'
            )
            ->orderBy('t.id_tienda')
            ->first();

        return response()->json([
            'negocio' => [
                'nombre' => $tienda->nombre ?? '',
                'correo' => $tienda->email ?? '',
                'telefono' => $tienda->telefono ?? '',
                'direccion' => $tienda
                    ? trim(($tienda->calle ?? '') . ' ' . ($tienda->num_ext ?? '') . ($tienda->num_int ? ' Int ' . $tienda->num_int : ''))
                    : '',
                'ciudad' => $tienda->ciudad ?? '',
                'estado' => $tienda->estado ?? '',
                'cp' => $tienda->cp ?? '',
                'rfc' => '',
            ],
        ]);
    }

    protected function referenceDate(string $table, string $column): ?Carbon
    {
        $date = DB::table($table)->max($column);

        return $date ? Carbon::parse($date) : null;
    }

    protected function salesTotalForRange(Carbon $start, Carbon $end): float
    {
        return (float) DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->whereBetween('v.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->sum(DB::raw('COALESCE(dv.cantidad * dv.precio_unitario, 0)'));
    }

    protected function purchaseTotalForRange(Carbon $start, Carbon $end): float
    {
        return (float) DB::table('compras as c')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->whereBetween('c.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->sum(DB::raw('COALESCE(dc.cantidad * dc.precio_compra, 0)'));
    }

    protected function buildMonthlyFlow(Carbon $start, Carbon $end): array
    {
        $salesByDay = DB::table('ventas as v')
            ->leftJoin('detalle_ventas as dv', 'dv.venta_id', '=', 'v.id_venta')
            ->whereBetween('v.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->select(
                DB::raw('DATE(v.fecha_hora) as fecha'),
                DB::raw('COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total')
            )
            ->groupBy(DB::raw('DATE(v.fecha_hora)'))
            ->pluck('total', 'fecha');

        $purchasesByDay = DB::table('compras as c')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->whereBetween('c.fecha_hora', [$start->toDateTimeString(), $end->toDateTimeString()])
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
}
