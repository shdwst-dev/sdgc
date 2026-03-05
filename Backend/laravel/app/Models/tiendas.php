<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class tiendas extends Model
{
    //
    protected $table = 'tiendas';
    protected $primaryKey = 'id_tienda';
    protected $fillable = [
        'nombre',
        'telefono',
        'email',
        'id_direccion',
    ];

    public function direccion () {
        return $this->belongsTo(direcciones::class, 'id_direccion');
    }

}
