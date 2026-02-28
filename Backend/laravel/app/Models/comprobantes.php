<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class comprobantes extends Model
{
    //
    protected $table = 'comprobantes';
    protected $primaryKey = 'id_comprobante';
    protected $fillable = [
        'id_venta',
        'id_estatus',
        'codigo_hash',
        'numero_correlativo',
        'fecha_emision',
    ];

    public function venta () {
        return $this->belongsTo(ventas::class, 'id_venta');
    }

    public function estatus () {
        return $this->belongsTo(estatus::class, 'id_estatus');
    }
}
