<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
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

    public function ver(int $idCliente)
    {
        $cliente = DB::table('usuarios as u')
            ->join('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->leftJoin('estatus as e', 'e.id_estatus', '=', 'u.id_estatus')
            ->leftJoin('direcciones as d', 'd.id_direccion', '=', 'p.id_direccion')
            ->leftJoin('calles as ca', 'ca.id_calle', '=', 'd.id_calle')
            ->leftJoin('colonias as co', 'co.id_colonia', '=', 'ca.id_colonia')
            ->leftJoin('municipios as m', 'm.id_municipio', '=', 'co.id_municipio')
            ->leftJoin('estados as es', 'es.id_estado', '=', 'm.id_estado')
            ->where('u.id_usuario', $idCliente)
            ->where('r.nombre', 'Comprador')
            ->select(
                'u.id_usuario',
                'u.email',
                'u.id_estatus',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'p.telefono',
                'e.nombre as estado',
                'es.nombre as estado_direccion',
                'm.nombre as municipio',
                'co.nombre as colonia',
                'co.cp',
                'ca.nombre as calle',
                'd.num_ext',
                'd.num_int'
            )
            ->first();

        if (!$cliente) {
            return response()->json([
                'message' => 'El cliente no existe.',
            ], 404);
        }

        return response()->json([
            'cliente' => [
                'id_usuario' => $cliente->id_usuario,
                'nombre' => $cliente->nombre,
                'apellido_paterno' => $cliente->apellido_paterno,
                'apellido_materno' => $cliente->apellido_materno,
                'telefono' => $cliente->telefono,
                'email' => $cliente->email,
                'id_estatus' => $cliente->id_estatus,
                'estado' => $cliente->estado ?? 'Activo',
                'direccion' => [
                    'estado' => $cliente->estado_direccion ?? '',
                    'municipio' => $cliente->municipio ?? '',
                    'colonia' => $cliente->colonia ?? '',
                    'cp' => $cliente->cp,
                    'calle' => $cliente->calle ?? '',
                    'num_ext' => $cliente->num_ext,
                    'num_int' => $cliente->num_int,
                ],
            ],
        ]);
    }

    public function actualizar(Request $request, int $idCliente)
    {
        $cliente = DB::table('usuarios as u')
            ->join('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->join('personas as p', 'p.id_persona', '=', 'u.id_persona')
            ->where('u.id_usuario', $idCliente)
            ->where('r.nombre', 'Comprador')
            ->select('u.id_usuario', 'u.id_persona')
            ->first();

        if (!$cliente) {
            return response()->json([
                'message' => 'El cliente no existe.',
            ], 404);
        }

        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'nullable|string|max:100',
            'telefono' => [
                'required',
                'string',
                'max:20',
                Rule::unique('personas', 'telefono')->ignore($cliente->id_persona, 'id_persona'),
            ],
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('usuarios', 'email')->ignore($cliente->id_usuario, 'id_usuario'),
            ],
            'estado' => 'required|string|max:100',
            'municipio' => 'required|string|max:100',
            'colonia' => 'required|string|max:100',
            'cp' => 'nullable|integer',
            'calle' => 'required|string|max:100',
            'num_ext' => 'required|integer|min:1',
            'num_int' => 'nullable|integer|min:0',
            'id_estatus' => 'required|integer|exists:estatus,id_estatus',
            'contrasena' => 'nullable|string|min:8',
        ]);

        try {
            DB::transaction(function () use ($data, $cliente) {
                $direccionId = $this->resolveAddressId($data);

                DB::table('personas')
                    ->where('id_persona', $cliente->id_persona)
                    ->update([
                        'nombre' => $data['nombre'],
                        'apellido_paterno' => $data['apellido_paterno'],
                        'apellido_materno' => $data['apellido_materno'] ?? null,
                        'telefono' => $data['telefono'],
                        'id_direccion' => $direccionId,
                    ]);

                $payloadUsuario = [
                    'email' => $data['email'],
                    'id_estatus' => $data['id_estatus'],
                ];

                if (!empty($data['contrasena'])) {
                    $payloadUsuario['contrasena'] = Hash::make($data['contrasena']);
                }

                DB::table('usuarios')
                    ->where('id_usuario', $cliente->id_usuario)
                    ->update($payloadUsuario);
            });

            return response()->json([
                'message' => 'Cliente actualizado correctamente.',
            ]);
        } catch (QueryException | RuntimeException $e) {
            return response()->json([
                'message' => 'No fue posible actualizar el cliente.',
                'error' => $e instanceof QueryException ? ($e->errorInfo[2] ?? $e->getMessage()) : $e->getMessage(),
            ], 422);
        }
    }

    public function eliminar(int $idCliente)
    {
        $clienteExiste = DB::table('usuarios as u')
            ->join('roles as r', 'r.id_rol', '=', 'u.id_rol')
            ->where('u.id_usuario', $idCliente)
            ->where('r.nombre', 'Comprador')
            ->exists();

        if (!$clienteExiste) {
            return response()->json([
                'message' => 'El cliente no existe.',
            ], 404);
        }

        $estatusInactivo = DB::table('estatus')
            ->where('nombre', 'Inactivo')
            ->value('id_estatus');

        if (!$estatusInactivo) {
            return response()->json([
                'message' => 'No existe el estatus Inactivo en el sistema.',
            ], 422);
        }

        DB::table('usuarios')
            ->where('id_usuario', $idCliente)
            ->update([
                'id_estatus' => $estatusInactivo,
            ]);

        return response()->json([
            'message' => 'Cliente eliminado correctamente.',
        ]);
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
