<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class tiendas_empleados extends Model
{
    //
    protected $table = 'tiendas_empleados';
    protected $primaryKey = 'id_tienda_empleado';
    protected $fillable = [
        'id_tienda',
        'id_empleado',
    ];

    public function tienda () {
        return $this->belongsTo(tiendas::class, 'id_tienda');
    }

    public function empleado () {
        return $this->belongsTo(usuarios::class, 'id_empleado', 'id_usuario');
    }
}
