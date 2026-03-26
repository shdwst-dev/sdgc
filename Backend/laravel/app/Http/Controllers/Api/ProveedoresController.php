<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProveedoresController extends Controller
{
    public function registrar(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'nullable|string|max:100',
            'telefono' => 'required|string|max:20|unique:personas,telefono',
            'razon_social' => 'required|string|max:200',
            'id_metodo_pago' => 'nullable|integer|exists:metodos_pago,id_metodo_pago',
            'estado' => 'required|string|max:100',
            'municipio' => 'required|string|max:100',
            'colonia' => 'required|string|max:100',
            'cp' => 'nullable|integer',
            'calle' => 'required|string|max:100',
            'num_ext' => 'required|integer|min:1',
            'num_int' => 'nullable|integer|min:0',
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

                DB::table('proveedores')->insert([
                    'id_persona' => $personaId,
                    'id_metodo_pago' => $data['id_metodo_pago'] ?? null,
                    'razon_social' => $data['razon_social'],
                ]);
            });

            return response()->json([
                'message' => 'Proveedor registrado correctamente.',
            ], 201);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible registrar el proveedor.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    public function ver(int $idProveedor)
    {
        $proveedor = DB::table('proveedores as pr')
            ->join('personas as p', 'p.id_persona', '=', 'pr.id_persona')
            ->leftJoin('metodos_pago as mp', 'mp.id_metodo_pago', '=', 'pr.id_metodo_pago')
            ->leftJoin('direcciones as d', 'd.id_direccion', '=', 'p.id_direccion')
            ->leftJoin('calles as ca', 'ca.id_calle', '=', 'd.id_calle')
            ->leftJoin('colonias as co', 'co.id_colonia', '=', 'ca.id_colonia')
            ->leftJoin('municipios as m', 'm.id_municipio', '=', 'co.id_municipio')
            ->leftJoin('estados as es', 'es.id_estado', '=', 'm.id_estado')
            ->leftJoin('compras as c', 'c.id_proveedor', '=', 'pr.id_proveedor')
            ->leftJoin('detalle_compras as dc', 'dc.id_compra', '=', 'c.id_compra')
            ->where('pr.id_proveedor', $idProveedor)
            ->select(
                'pr.id_proveedor',
                'pr.razon_social',
                'pr.id_metodo_pago',
                'mp.nombre as metodo_pago',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'p.telefono',
                'es.nombre as estado_direccion',
                'm.nombre as municipio',
                'co.nombre as colonia',
                'co.cp',
                'ca.nombre as calle',
                'd.num_ext',
                'd.num_int',
                DB::raw('COUNT(DISTINCT c.id_compra) as compras'),
                DB::raw('COUNT(DISTINCT dc.producto_id) as productos'),
                DB::raw('MAX(c.fecha_hora) as ultimo_pedido')
            )
            ->groupBy(
                'pr.id_proveedor',
                'pr.razon_social',
                'pr.id_metodo_pago',
                'mp.nombre',
                'p.nombre',
                'p.apellido_paterno',
                'p.apellido_materno',
                'p.telefono',
                'es.nombre',
                'm.nombre',
                'co.nombre',
                'co.cp',
                'ca.nombre',
                'd.num_ext',
                'd.num_int'
            )
            ->first();

        if (!$proveedor) {
            return response()->json([
                'message' => 'El proveedor no existe.',
            ], 404);
        }

        return response()->json([
            'proveedor' => [
                'id_proveedor' => $proveedor->id_proveedor,
                'razon_social' => $proveedor->razon_social,
                'id_metodo_pago' => $proveedor->id_metodo_pago,
                'metodo_pago' => $proveedor->metodo_pago,
                'nombre' => $proveedor->nombre,
                'apellido_paterno' => $proveedor->apellido_paterno,
                'apellido_materno' => $proveedor->apellido_materno,
                'telefono' => $proveedor->telefono,
                'compras' => (int) $proveedor->compras,
                'productos' => (int) $proveedor->productos,
                'ultimo_pedido' => $proveedor->ultimo_pedido,
                'direccion' => [
                    'estado' => $proveedor->estado_direccion ?? '',
                    'municipio' => $proveedor->municipio ?? '',
                    'colonia' => $proveedor->colonia ?? '',
                    'cp' => $proveedor->cp,
                    'calle' => $proveedor->calle ?? '',
                    'num_ext' => $proveedor->num_ext,
                    'num_int' => $proveedor->num_int,
                ],
            ],
        ]);
    }

    public function actualizar(Request $request, int $idProveedor)
    {
        $proveedor = DB::table('proveedores as pr')
            ->join('personas as p', 'p.id_persona', '=', 'pr.id_persona')
            ->where('pr.id_proveedor', $idProveedor)
            ->select('pr.id_proveedor', 'pr.id_persona')
            ->first();

        if (!$proveedor) {
            return response()->json([
                'message' => 'El proveedor no existe.',
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
                Rule::unique('personas', 'telefono')->ignore($proveedor->id_persona, 'id_persona'),
            ],
            'razon_social' => 'required|string|max:200',
            'id_metodo_pago' => 'nullable|integer|exists:metodos_pago,id_metodo_pago',
            'estado' => 'required|string|max:100',
            'municipio' => 'required|string|max:100',
            'colonia' => 'required|string|max:100',
            'cp' => 'nullable|integer',
            'calle' => 'required|string|max:100',
            'num_ext' => 'required|integer|min:1',
            'num_int' => 'nullable|integer|min:0',
        ]);

        try {
            DB::transaction(function () use ($data, $proveedor) {
                $direccionId = $this->resolveAddressId($data);

                DB::table('personas')
                    ->where('id_persona', $proveedor->id_persona)
                    ->update([
                        'nombre' => $data['nombre'],
                        'apellido_paterno' => $data['apellido_paterno'],
                        'apellido_materno' => $data['apellido_materno'] ?? null,
                        'telefono' => $data['telefono'],
                        'id_direccion' => $direccionId,
                    ]);

                DB::table('proveedores')
                    ->where('id_proveedor', $proveedor->id_proveedor)
                    ->update([
                        'razon_social' => $data['razon_social'],
                        'id_metodo_pago' => $data['id_metodo_pago'] ?? null,
                    ]);
            });

            return response()->json([
                'message' => 'Proveedor actualizado correctamente.',
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'No fue posible actualizar el proveedor.',
                'error' => $e->errorInfo[2] ?? $e->getMessage(),
            ], 422);
        }
    }

    public function eliminar(int $idProveedor)
    {
        $proveedor = DB::table('proveedores')
            ->where('id_proveedor', $idProveedor)
            ->select('id_proveedor', 'id_persona')
            ->first();

        if (!$proveedor) {
            return response()->json([
                'message' => 'El proveedor no existe.',
            ], 404);
        }

        $tieneCompras = DB::table('compras')
            ->where('id_proveedor', $idProveedor)
            ->exists();

        $tienePromociones = DB::table('promociones')
            ->where('id_proveedor', $idProveedor)
            ->exists();

        if ($tieneCompras || $tienePromociones) {
            return response()->json([
                'message' => 'No es posible eliminar el proveedor porque tiene movimientos relacionados.',
            ], 422);
        }

        DB::transaction(function () use ($proveedor) {
            DB::table('proveedores')
                ->where('id_proveedor', $proveedor->id_proveedor)
                ->delete();

            DB::table('personas')
                ->where('id_persona', $proveedor->id_persona)
                ->delete();
        });

        return response()->json([
            'message' => 'Proveedor eliminado correctamente.',
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
