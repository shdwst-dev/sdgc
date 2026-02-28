<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class municipios extends Model
{
    //
    protected $table = 'municipios';
    protected $primaryKey = 'id_municipio';
    protected $fillable = [
        'id_estado',
        'nombre',
    ];

    public function estado()
    {
        return $this->belongsTo(estados::class, 'id_estado');
    }

    public function colonias () {
        return $this->hasMany(colonias::class);
    }
}
