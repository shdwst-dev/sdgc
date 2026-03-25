<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class UsuariosController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'nullable|string|max:100',
            'telefono' => 'required|string|max:20',
            'id_direccion' => 'required|integer|exists:direcciones,id_direccion',
            'email' => 'required|email|max:100',
            'contrasena' => 'required|string|min:8',
            'id_rol' => 'nullable|integer|exists:roles,id_rol',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::statement(
                'CALL pa_registrar_usuario(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $data['nombre'],
                    $data['apellido_paterno'],
                    $data['apellido_materno'] ?? null,
                    $data['telefono'],
                    $data['id_direccion'],
                    $data['email'],
                    $data['contrasena'],
                    $data['id_rol'] ?? 2,
                    $data['id_estatus'] ?? 1,
                ]
            );

            return response()->json([
                'message' => 'Usuario registrado correctamente.'
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar el usuario.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

}
