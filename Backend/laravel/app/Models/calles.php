<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class calles extends Model
{
    //
    protected $table = 'calles';
    protected $primaryKey = 'id_calle';
    public $timestamps = false;
    protected $fillable = [
        'id_colonia',
        'nombre',
    ];

    public function colonia()
    {
        return $this->belongsTo(colonias::class, 'id_colonia');
    }

    public function direcciones () {
        return $this->hasMany(direcciones::class);
    }
}
