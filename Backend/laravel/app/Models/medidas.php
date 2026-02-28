<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class medidas extends Model
{
    //
    protected $table = 'medidas';
    protected $primaryKey = 'id_medida';
    protected $fillable = [
        'altura',
        'ancho',
        'peso',
        'volumen',
    ];

    public function producto () {
        return $this->hasOne(productos::class);
    }
}
