<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class promociones_productos extends Model
{
    //
    protected $table = 'promociones_productos';
    protected $primaryKey = 'id_promocion_producto';
    protected $fillable = [
        'id_promocion',
        'id_producto',
    ];

    public function promocion () {
        return $this->belongsTo(promociones::class, 'id_promocion', 'id_promocion');
    }

    public function producto () {
        return $this->belongsTo(productos::class, 'id_producto', 'id_producto');
    }
}
