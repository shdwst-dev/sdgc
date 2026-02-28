<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class direcciones extends Model
{
    //
    protected $table = 'direcciones';
    protected $primaryKey = 'id_direccion';
    protected $fillable = [
        'id_calle',
        'numero_int',
        'numero_ext',
    ];

    public function calle()
    {
        return $this->belongsTo(calles::class, 'id_calle');
    }

    public function personas()
    {
        return $this->hasMany(personas::class);
    }
}
