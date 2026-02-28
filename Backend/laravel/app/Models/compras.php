<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class compras extends Model
{
    //
    protected $table = 'compras';
    protected $primaryKey = 'id_compra';
    protected $fillable = [
        'id_proveedor',
        'fecha_hora',
        'id_metodo_pago',
        'id_estatus',
    ];

    public function proveedor () {
        return $this->belongsTo(proveedores::class, 'id_proveedor');
    }

    public function metodo_pago () {
        return $this->belongsTo(metodos_pago::class, 'id_metodo_pago');
    }

    public function estatus () {
        return $this->belongsTo(estatus::class, 'id_estatus');
    }

    public function detalles_compra () {
        return $this->hasMany(detalles_compra::class);
    }
}
