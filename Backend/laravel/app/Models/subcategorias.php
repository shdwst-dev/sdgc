<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class subcategorias extends Model
{
    //
    protected $table = 'subcategorias';
    protected $primaryKey = 'id_subcategoria';
    protected $fillable = [
        'id_categoria',
        'nombre',
    ];

    public function categoria()
    {
        return $this->belongsTo(categorias::class, 'id_categoria');
    }

    public function productos () {
        return $this->hasMany(productos::class);
    }
}
