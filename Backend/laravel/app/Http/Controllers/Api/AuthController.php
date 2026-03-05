<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\usuarios;

class AuthController extends Controller
{
    //
    public function login(Request $request)
    {
       $data = $request->validate([
            'email' => 'required|string',
            'contrasena' => 'required|string',
        ]);

        $user = usuarios::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['contrasena'], $user->contrasena)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales son incorrectas.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => [
                'id_usuario' => $user->id_usuario,
                'email' => $user->email,
                'rol' => $user->roles?->nombre,
                'estatus' => $user->estatus?->nombre,
                'persona' => $user->personas ? [
                    'id_persona' => $user->personas->id_persona,
                    'nombre' => $user->personas->nombre,
                    'ap' => $user->personas->apellido_paterno,
                    'am' => $user->personas->apellido_materno,
                    'telefono' => $user->personas->telefono,
                    'direccion' => $user->personas->direccion ? [

                    ]: null,
                ]: null,
            ]
        ]);
    }
}
