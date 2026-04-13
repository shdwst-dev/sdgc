<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\usuarios_direcciones;
use App\Models\direcciones;
use App\Models\calles;
use App\Models\colonias;
use App\Models\municipios;
use App\Models\estados;
use App\Models\paises;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DireccionController extends Controller
{
    /**
     * Listar las direcciones del usuario actual.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $direcciones = usuarios_direcciones::where('id_usuario', $user->id_usuario)
            ->with(['direccion.calle.colonia.municipio.estado.pais'])
            ->get();

        return response()->json($this->formatDirecciones($direcciones));
    }

    /**
     * Sincronizar/Crear una dirección usando normalización inteligente.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'etiqueta' => 'nullable|string|max:50',
            'calle' => 'required|string|max:100',
            'numero_exterior' => 'required|string|max:20',
            'numero_interior' => 'nullable|string|max:20',
            'colonia' => 'required|string|max:100',
            'ciudad' => 'required|string|max:100', // Municipio
            'estado' => 'required|string|max:100',
            'codigoPostal' => 'required|string|max:10',
            'es_principal' => 'nullable|boolean'
        ]);

        try {
            return DB::transaction(function () use ($user, $data) {
                // 1. Asegurar País (Default México si no se provee)
                $pais = paises::firstOrCreate(['nombre' => 'México']);

                // 2. Asegurar Estado
                $estado = estados::firstOrCreate([
                    'id_pais' => $pais->id_pais,
                    'nombre' => $data['estado']
                ]);

                // 3. Asegurar Municipio (Ciudad)
                $municipio = municipios::firstOrCreate([
                    'id_estado' => $estado->id_estado,
                    'nombre' => $data['ciudad']
                ]);

                // 4. Asegurar Colonia
                $colonia = colonias::firstOrCreate([
                    'id_municipio' => $municipio->id_municipio,
                    'nombre' => $data['colonia'],
                    'cp' => (int) $data['codigoPostal']
                ]);

                // 5. Asegurar Calle
                $calle = calles::firstOrCreate([
                    'id_colonia' => $colonia->id_colonia,
                    'nombre' => $data['calle']
                ]);

                // 6. Crear/Asegurar Dirección Física
                $direccion = direcciones::firstOrCreate([
                    'id_calle' => $calle->id_calle,
                    'num_ext' => (int) $data['numero_exterior'],
                    'num_int' => isset($data['numero_interior']) ? (int) $data['numero_interior'] : null,
                ]);

                // Si se marcó como principal, quitar principalía a las otras
                if (!empty($data['es_principal'])) {
                    usuarios_direcciones::where('id_usuario', $user->id_usuario)
                        ->update(['es_principal' => false]);
                }

                // 7. Vincular al usuario
                $userAddress = usuarios_direcciones::firstOrCreate([
                    'id_usuario' => $user->id_usuario,
                    'id_direccion' => $direccion->id_direccion
                ], [
                    'etiqueta' => $data['etiqueta'] ?? 'Hogar',
                    'es_principal' => $data['es_principal'] ?? false
                ]);

                return response()->json([
                    'message' => 'Dirección sincronizada correctamente.',
                    'id' => $userAddress->id_usuario_direccion
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al sincronizar dirección.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar el vínculo de la dirección con el usuario.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $address = usuarios_direcciones::where('id_usuario', $user->id_usuario)
            ->where('id_usuario_direccion', $id)
            ->first();

        if (!$address) {
            return response()->json(['message' => 'Dirección no encontrada.'], 404);
        }

        $address->delete();

        return response()->json(['message' => 'Dirección eliminada correctamente.']);
    }

    /**
     * Formatear la respuesta para el consumo del móvil (Flat structure)
     */
    private function formatDirecciones($raw)
    {
        return $raw->map(function ($item) {
            $d = $item->direccion;
            $c = $d->calle;
            $col = $c->colonia;
            $mun = $col->municipio;
            $est = $mun->estado;

            return [
                'id' => $item->id_usuario_direccion,
                'nombre' => $item->etiqueta,
                'etiqueta' => $item->etiqueta,
                'calle' => $c->nombre,
                'numero_exterior' => (string) $d->num_ext,
                'numero_interior' => (string) $d->num_int,
                'colonia' => $col->nombre,
                'ciudad' => $mun->nombre,
                'estado' => $est->nombre,
                'codigoPostal' => (string) $col->cp,
                'es_principal' => (bool) $item->es_principal
            ];
        });
    }
}
