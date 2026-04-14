<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$stock = \Illuminate\Support\Facades\DB::table('stock')->get();
echo json_encode($stock);
