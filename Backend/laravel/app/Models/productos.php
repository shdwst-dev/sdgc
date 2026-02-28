<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class productos extends Model
{
    //
    protected $table = 'productos';
    protected $primaryKey = 'id_producto';
    protected $fillable = [
        'id_medida',
        'id_unidad',
        'id_subcategoria',
        'nombre',
        'fecha_entrada',
        'id_estatus',
        'precio_base',
        'precio_unitario',
        'codigo_barras',
        'imagen_url',
    ];

    public function medida () {
        return $this->belongsTo(medidas::class, 'id_medida');
    }

    public function unidad_medida () {
        return $this->belongsTo(unidades_medida::class, 'id_unidad', 'id_unidad_medida');
    }

    public function subcategoria () {
        return $this->belongsTo(subcategorias::class, 'id_subcategoria');
    }

    public function estatus () {
        return $this->belongsTo(estatus::class, 'id_estatus');
    }
}
