<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class proveedores extends Model
{
    //
    protected $table = 'proveedores';
    protected $primaryKey = 'id_proveedor';
    protected $fillable = [
        'id_persona',
        'id_metodo_pago',
        'razon_social',
    ];

    public function persona () {
        return $this->belongsTo(personas::class, 'id_persona');
    }

    public function metodo_pago () {
        return $this->belongsTo(metodos_pago::class, 'id_metodo_pago');
    }

    public function compras () {
        return $this->hasMany(compras::class);
    }
}
