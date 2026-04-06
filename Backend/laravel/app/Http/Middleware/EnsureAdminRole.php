<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe el acceso a usuarios con rol Admin o Super Admin.
 *
 * Uso en rutas:  ->middleware('admin')
 */
class EnsureAdminRole
{
    private const ALLOWED_ROLES = ['Administrador', 'Admin', 'Super Admin'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado.',
            ], 401);
        }

        $roleName = $user->rol?->nombre ?? null;

        if (!$roleName && $user->id_rol) {
            $roleName = DB::table('roles')
                ->where('id_rol', $user->id_rol)
                ->value('nombre');
        }

        if (!in_array($roleName, self::ALLOWED_ROLES, true)) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a esta sección. Se requiere rol de administrador.',
            ], 403);
        }

        return $next($request);
    }
}
