<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class metodos_pago extends Model
{
    //
    protected $table = 'metodos_pago';
    protected $primaryKey = 'id_metodo_pago';
    protected $fillable = [
        'nombre',
    ];

    public function proveedores () {
        return $this->hasMany(proveedores::class);
    }

    public function compras () {
        return $this->hasMany(compras::class);
    }

    public function ventas () {
        return $this->hasMany(ventas::class);
    }

    public function usuarios () {
        return $this->hasMany(usuarios::class);
    }
}
