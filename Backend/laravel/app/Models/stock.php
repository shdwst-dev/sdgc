<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class stock extends Model
{
    //
    protected $table = 'stock';
    protected $primaryKey = 'id_stock';
    protected $fillable = [
        'id_tienda',
        'id_producto',
        'stock_minimo',
        'stock_actual',
    ];

    public function producto () {
        return $this->belongsTo(productos::class, 'id_producto');
    }

    public function tienda () {
        return $this->belongsTo(tiendas::class, 'id_tienda');
    }

}
