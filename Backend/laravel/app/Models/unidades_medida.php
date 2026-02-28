<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class unidades_medida extends Model
{
    //
    protected $table = 'unidades_medida';
    protected $primaryKey = 'id_unidad_medida';
    protected $fillable = [
        'nombre',
        'abreviatura',
    ];

    public function producto () {
        return $this->hasOne(productos::class);
    }
}
