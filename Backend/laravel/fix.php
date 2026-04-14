<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = 0;
$productos = \Illuminate\Support\Facades\DB::table('productos')->where('imagen_url', 'like', 'http%')->get();
foreach ($productos as $prod) {
    if (preg_match('/^http[s]?:\/\/[^\/]+(\/productos\/.*)$/', $prod->imagen_url, $matches)) {
        \Illuminate\Support\Facades\DB::table('productos')
            ->where('id_producto', $prod->id_producto)
            ->update(['imagen_url' => $matches[1]]);
        $count++;
    }
}
echo "Fixed $count products\n";
