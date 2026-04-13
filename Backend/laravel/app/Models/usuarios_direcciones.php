<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class usuarios_direcciones extends Model
{
    use HasFactory;

    protected $table = 'usuarios_direcciones';
    protected $primaryKey = 'id_usuario_direccion';
    
    // El sistema usa fecha_hora para timestamps usualmente, 
    // pero para este nuevo modelo usaremos los estándar de Laravel
    // asumiendo que el usuario no tiene una restricción estricta en tablas nuevas.
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'id_usuario',
        'id_direccion',
        'etiqueta',
        'es_principal'
    ];

    public function usuario()
    {
        return $this->belongsTo(usuarios::class, 'id_usuario');
    }

    public function direccion()
    {
        return $this->belongsTo(direcciones::class, 'id_direccion');
    }
}
