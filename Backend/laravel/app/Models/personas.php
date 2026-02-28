<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class personas extends Model
{
    //
    protected $table = 'personas';
    protected $primaryKey = 'id_persona';
    protected $fillable = [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'telefono',
        'id_direccion',
    ];

    public function direccion()
    {
        return $this->belongsTo(direcciones::class, 'id_direccion');
    }

    public function proveedores()
    {
        return $this->hasOne(proveedores::class);
    }

    public function usuarios()
    {
        return $this->hasOne(usuarios::class);
    }
}
