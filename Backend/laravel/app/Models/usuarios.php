<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class usuarios extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'usuarios';
    protected $primaryKey = 'id_usuario';
    public $timestamps = false;
    protected $fillable = [
        'id_persona',
        'contrasena',
        'email',
        'id_rol',
        'id_estatus',
    ];

    protected $hidden = ['contrasena'];

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

    public function getAuthPassword()
    {
        return $this->contrasena;
    }
}
