<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureAnyRole
{
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
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

        if (!$roleName || !in_array($roleName, $allowedRoles, true)) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a esta seccion.',
            ], 403);
        }

        return $next($request);
    }
}

