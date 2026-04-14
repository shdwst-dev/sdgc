<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$storeId = null;
$producto = \Illuminate\Support\Facades\DB::table('productos as p')
    ->leftJoin('subcategorias as s', 's.id_subcategoria', '=', 'p.id_subcategoria')
    ->leftJoin('stock as st', function ($join) use ($storeId) {
        $join->on('st.id_producto', '=', 'p.id_producto');
        if ($storeId) {
            $join->where('st.id_tienda', '=', $storeId);
        }
    })
    ->select(
        'p.id_producto',
        'p.id_subcategoria',
        'p.nombre',
        'p.codigo_barras',
        'p.precio_base',
        'p.precio_unitario',
        'p.id_estatus',
        'p.imagen_url',
        's.nombre as categoria',
        \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(st.stock_actual), 0) as stock_actual'),
        \Illuminate\Support\Facades\DB::raw('MIN(st.stock_minimo) as stock_minimo')
    )
    ->where('p.id_producto', 1)
    ->groupBy(
        'p.id_producto',
        'p.id_subcategoria',
        'p.nombre',
        'p.codigo_barras',
        'p.precio_base',
        'p.precio_unitario',
        'p.id_estatus',
        'p.imagen_url',
        's.nombre'
    )
    ->first();
file_put_contents('query_dump.json', json_encode($producto, JSON_PRETTY_PRINT));
