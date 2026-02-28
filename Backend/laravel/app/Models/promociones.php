<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class promociones extends Model
{
    //
    protected $table = 'promociones';
    protected $primaryKey = 'id_promocion';
    protected $fillable = [
        'id_promocion',
        'id_tipo_descuento',
        'id_proveedor',
        'valor_descuento',
        'fecha_inicio',
        'fecha_fin',
        'codigo_cupon',
        'nombre',
        'id_estatus',
    ];

    public function tipo_descuento () {
        return $this->belongsTo(tipo_descuentos::class, 'id_tipo_descuento', 'id_tipo_descuento');
    }

    public function proveedor () {
        return $this->belongsTo(proveedores::class, 'id_proveedor', 'id_proveedor');
    }

    public function estatus () {
        return $this->belongsTo(estatus::class, 'id_estatus', 'id_estatus');
    }
}
