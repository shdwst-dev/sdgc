<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class detalle_compras extends Model
{
    //
    protected $table = 'detalle_compras';
    protected $primaryKey = 'id_detalle_compra';
    protected $fillable = [
        'id_compra',
        'producto_id',
        'cantidad',
        'precio_compra',
    ];

    public function compra () {
        return $this->belongsTo(compras::class, 'id_compra', 'id_compra');
    }

    public function producto () {
        return $this->belongsTo(productos::class, 'producto_id', 'id_producto');
    }
}
