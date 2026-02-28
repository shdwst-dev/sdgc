<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class sesiones extends Model
{
    //
    protected $table = 'sesiones';
    protected $primaryKey = 'id_sesion';
    protected $fillable = [
        'fecha_inicio',
        'fecha_fin',
        'id_usuario',
    ];

    public function usuario () {
        return $this->belongsTo(usuarios::class, 'id_usuario');
    }
}
