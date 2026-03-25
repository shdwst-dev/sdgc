<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use RuntimeException;
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

        $user = usuarios::where('email', $data['email'])
            ->with([
                'persona.direccion.calle.colonia.municipio.estado.pais',
                'rol',
                'estatus'
            ])
            ->first();

        if (!$user || !$this->isValidPassword($data['contrasena'], $user)) {
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
                'rol' => $user->rol?->nombre,
                'estatus' => $user->estatus?->nombre,
                'persona' => $user->persona ? [
                    'id_persona' => $user->persona->id_persona,
                    'nombre' => $user->persona->nombre,
                    'ap' => $user->persona->apellido_paterno,
                    'am' => $user->persona->apellido_materno,
                    'telefono' => $user->persona->telefono,
                    'direccion' => $user->persona->direccion ? [
                        'id_direccion' => $user->persona->direccion->id_direccion,
                        'numero_int' => $user->persona->direccion->numero_int,
                        'numero_ext' => $user->persona->direccion->numero_ext,
                        'calle' => $user->persona->direccion->calle ? [
                            'id_calle' => $user->persona->direccion->calle->id_calle,
                            'nombre' => $user->persona->direccion->calle->nombre,
                            'colonia' => $user->persona->direccion->calle->colonia ? [
                                'id_colonia' => $user->persona->direccion->calle->colonia->id_colonia,
                                'nombre' => $user->persona->direccion->calle->colonia->nombre,
                                'cp' => $user->persona->direccion->calle->colonia->cp,
                                'municipio' => $user->persona->direccion->calle->colonia->municipio ? [
                                    'id_municipio' => $user->persona->direccion->calle->colonia->municipio->id_municipio,
                                    'nombre' => $user->persona->direccion->calle->colonia->municipio->nombre,
                                    'estado' => $user->persona->direccion->calle->colonia->municipio->estado ? [
                                        'id_estado' => $user->persona->direccion->calle->colonia->municipio->estado->id_estado,
                                        'nombre' => $user->persona->direccion->calle->colonia->municipio->estado->nombre,
                                        'pais' => $user->persona->direccion->calle->colonia->municipio->estado->pais ? [
                                            'id_pais' => $user->persona->direccion->calle->colonia->municipio->estado->pais->id_pais,
                                            'nombre' => $user->persona->direccion->calle->colonia->municipio->estado->pais->nombre,
                                        ] : null,
                                    ] : null,
                                ] : null,
                            ] : null,
                        ] : null,
                    ] : null,
                ] : null,
            ]
        ]);
    }

    public function me(Request $request){
        $user = $request->user();
        $user -> load([
            'persona',
            'rol',
            'estatus',
        ]);

        return response()->json($user);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente.'
        ]);
    }

    private function isValidPassword(string $plainPassword, usuarios $user): bool
    {
        try {
            if (Hash::check($plainPassword, $user->contrasena)) {
                return true;
            }
        } catch (RuntimeException $e) {
        }

        if (hash_equals((string) $user->contrasena, $plainPassword)) {
            $user->contrasena = Hash::make($plainPassword);
            $user->save();

            return true;
        }

        return false;
    }
}
