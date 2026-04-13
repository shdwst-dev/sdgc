<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class direcciones extends Model
{
    //
    protected $table = 'direcciones';
    protected $primaryKey = 'id_direccion';
    public $timestamps = false;
    protected $fillable = [
        'id_calle',
        'num_int',
        'num_ext',
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
