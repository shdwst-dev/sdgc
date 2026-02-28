<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class usuarios extends Model
{
    //
    protected $table = 'usuarios';
    protected $primaryKey = 'id_usuario';
    protected $fillable = [
        'id_persona',
        'contrasena',
        'email',
        'id_rol',
        'id_estatus',
    ];

    public function persona()
    {
        return $this->belongsTo(personas::class, 'id_persona');
    }

    public function rol()
    {
        return $this->belongsTo(roles::class, 'id_rol');
    }

    public function estatus()
    {
        return $this->belongsTo(estatus::class, 'id_estatus');
    }
}
