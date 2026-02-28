<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class detalle_compras extends Model
{
    //
    protected $table = 'detalle_compras';
    protected $primaryKey = 'id_detalle_compra';
    protected $fillable = [
        'compra_id',
        'producto_id',
        'cantidad',
        'precio_compra',
    ];

    public function compra () {
        return $this->belongsTo(compras::class, 'compra_id', 'id_compra');
    }

    public function producto () {
        return $this->belongsTo(productos::class, 'producto_id', 'id_producto');
    }
}
