<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ventas extends Model
{
    //
    protected $table = 'ventas';
    protected $primaryKey = 'id_venta';
    protected $fillable = [
        'id_usuario',
        'id_sesion',
        'fecha_hora',
        'id_metodo_pago',
        'id_estatus',
    ];

    public function estatus () {
        return $this->belongsTo(estatus::class, 'id_estatus');
    }

    public function metodo_pago () {
        return $this->belongsTo(metodos_pagos::class, 'id_metodo_pago');
    }

    public function sesion () {
        return $this->belongsTo(sesiones::class, 'id_sesion');
    }

    public function usuario () {
        return $this->belongsTo(usuarios::class, 'id_usuario');
    }

    public function detalles_venta () {
        return $this->hasMany(detalles_venta::class);
    }
}
