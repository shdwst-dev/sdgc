<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class estatus extends Model
{
    //
    protected $table = 'estatus';
    protected $primaryKey = 'id_estatus';
    protected $fillable = [
        'nombre',
    ];

    public function producto () {
        return $this->hasOne(productos::class);
    }

    public function compra () {
        return $this->hasOne(compras::class);
    }

    public function venta () {
        return $this->hasOne(ventas::class);
    }

}
