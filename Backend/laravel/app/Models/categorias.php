<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class categorias extends Model
{
    //
    protected $table = 'categorias';
    protected $primaryKey = 'id_categoria';
    protected $fillable = [
        'nombre',
    ];

    public function subcategorias () {
        return $this->hasMany(subcategorias::class);
    }
}
