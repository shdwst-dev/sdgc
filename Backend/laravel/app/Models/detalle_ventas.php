<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class detalle_ventas extends Model
{
    //
    protected $table = 'detalle_ventas';
    protected $primaryKey = 'id_detalle_venta';
    protected $fillable = [
        'venta_id',
        'producto_id',
        'cantidad',
        'precio_unitario',
    ];

    public function venta () {
        return $this->belongsTo(ventas::class, 'venta_id', 'id_venta');
    }

    public function producto () {
        return $this->belongsTo(productos::class, 'producto_id', 'id_producto');
    }


}
