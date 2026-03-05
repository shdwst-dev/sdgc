<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class tipo_descuento extends Model
{
    //
    protected $table = 'tipo_descuento';
    protected $primaryKey = 'id_tipo_descuento';
    protected $fillable = [
        'nombre',
    ];


}
