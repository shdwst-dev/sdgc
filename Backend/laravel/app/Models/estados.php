<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class estados extends Model
{
    //
    protected $table = 'estados';
    protected $primaryKey = 'id_estado';
    protected $fillable = [
        'id_pais',
        'nombre',
    ];

    public function pais()
    {
        return $this->belongsTo(paises::class, 'id_pais');
    }

    public function municipios () {
        return $this->hasMany(municipios::class);
    }
}
