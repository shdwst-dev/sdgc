<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class ClientesController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'nullable|string|max:100',
            'telefono' => 'required|string|max:20|unique:personas,telefono',
            'email' => 'required|email|max:100|unique:usuarios,email',
            'contrasena' => 'required|string|min:8',
            'estado' => 'required|string|max:100',
            'municipio' => 'required|string|max:100',
            'colonia' => 'required|string|max:100',
            'cp' => 'nullable|integer',
            'calle' => 'required|string|max:100',
            'num_ext' => 'required|integer|min:1',
            'num_int' => 'nullable|integer|min:0',
            'id_estatus' => 'nullable|integer|exists:estatus,id_estatus',
        ]);

        try {
            DB::transaction(function () use ($data) {
                $direccionId = $this->resolveAddressId($data);

                $personaId = DB::table('personas')->insertGetId([
                    'nombre' => $data['nombre'],
                    'apellido_paterno' => $data['apellido_paterno'],
                    'apellido_materno' => $data['apellido_materno'] ?? null,
                    'telefono' => $data['telefono'],
                    'id_direccion' => $direccionId,
                ], 'id_persona');

                $compradorRoleId = DB::table('roles')
                    ->where('nombre', 'Comprador')
                    ->value('id_rol');

                if (!$compradorRoleId) {
                    throw new RuntimeException('No existe el rol Comprador.');
                }

                DB::table('usuarios')->insert([
                    'id_persona' => $personaId,
                    'email' => $data['email'],
                    'contrasena' => Hash::make($data['contrasena']),
                    'id_rol' => $compradorRoleId,
                    'id_estatus' => $data['id_estatus'] ?? 1,
                ]);
            });

            return response()->json([
                'message' => 'Cliente registrado correctamente.',
            ], 201);
        } catch (QueryException | RuntimeException $e) {
            return response()->json([
                'message' => 'No fue posible registrar el cliente.',
                'error' => $e instanceof QueryException ? ($e->errorInfo[2] ?? $e->getMessage()) : $e->getMessage(),
            ], 422);
        }
    }

    private function resolveAddressId(array $data): int
    {
        $paisId = DB::table('paises')->where('nombre', 'México')->value('id_pais');

        if (!$paisId) {
            $paisId = DB::table('paises')->insertGetId(['nombre' => 'México'], 'id_pais');
        }

        $estadoId = DB::table('estados')->where([
            'id_pais' => $paisId,
            'nombre' => $data['estado'],
        ])->value('id_estado');

        if (!$estadoId) {
            $estadoId = DB::table('estados')->insertGetId([
                'id_pais' => $paisId,
                'nombre' => $data['estado'],
            ], 'id_estado');
        }

        $municipioId = DB::table('municipios')->where([
            'id_estado' => $estadoId,
            'nombre' => $data['municipio'],
        ])->value('id_municipio');

        if (!$municipioId) {
            $municipioId = DB::table('municipios')->insertGetId([
                'id_estado' => $estadoId,
                'nombre' => $data['municipio'],
            ], 'id_municipio');
        }

        $coloniaId = DB::table('colonias')->where([
            'id_municipio' => $municipioId,
            'nombre' => $data['colonia'],
        ])->value('id_colonia');

        if (!$coloniaId) {
            $coloniaId = DB::table('colonias')->insertGetId([
                'id_municipio' => $municipioId,
                'nombre' => $data['colonia'],
                'cp' => $data['cp'] ?? null,
            ], 'id_colonia');
        } elseif (isset($data['cp'])) {
            DB::table('colonias')
                ->where('id_colonia', $coloniaId)
                ->update(['cp' => $data['cp']]);
        }

        $calleId = DB::table('calles')->where([
            'id_colonia' => $coloniaId,
            'nombre' => $data['calle'],
        ])->value('id_calle');

        if (!$calleId) {
            $calleId = DB::table('calles')->insertGetId([
                'id_colonia' => $coloniaId,
                'nombre' => $data['calle'],
            ], 'id_calle');
        }

        $direccionId = DB::table('direcciones')->where([
            'id_calle' => $calleId,
            'num_ext' => $data['num_ext'],
            'num_int' => $data['num_int'] ?? null,
        ])->value('id_direccion');

        if (!$direccionId) {
            $direccionId = DB::table('direcciones')->insertGetId([
                'id_calle' => $calleId,
                'num_ext' => $data['num_ext'],
                'num_int' => $data['num_int'] ?? null,
            ], 'id_direccion');
        }

        return $direccionId;
    }
}
