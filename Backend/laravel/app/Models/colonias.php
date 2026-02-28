<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class colonias extends Model
{
    //
    protected $table = 'colonias';
    protected $primaryKey = 'id_colonia';
    protected $fillable = [
        'id_municipio',
        'nombre',
        'cp',
    ];

    public function municipio()
    {
        return $this->belongsTo(municipios::class, 'id_municipio');
    }

    public function calles () {
        return $this->hasMany(calles::class);
    }
}
