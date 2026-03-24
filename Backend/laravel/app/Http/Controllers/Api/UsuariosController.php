<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
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
            // Create person
            $idPersona = DB::table('personas')->insertGetId([
                'nombre' => $data['nombre'],
                'apellido_paterno' => $data['apellido_paterno'],
                'apellido_materno' => $data['apellido_materno'] ?? null,
                'telefono' => $data['telefono'],
                'id_direccion' => $data['id_direccion'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create user
            DB::table('usuarios')->insert([
                'id_persona' => $idPersona,
                'email' => $data['email'],
                'contrasena' => $this->hashPassword($data['contrasena']),
                'id_rol' => $data['id_rol'] ?? 2,
                'id_estatus' => $data['id_estatus'] ?? 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

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

    private function hashPassword(string $plainPassword): string
    {
        return Hash::make($plainPassword);
    }
}
