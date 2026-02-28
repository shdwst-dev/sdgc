<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class paises extends Model
{
    //
    protected $table = 'paises';
    protected $primaryKey = 'id_pais';
    protected $fillable = [
        'nombre',
    ];

    public function estados () {
        return $this->hasMany(estados::class);
    }

}
