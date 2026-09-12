<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsCourier
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isCourier() && ! $user->hasFullAccess())) {
            return response()->json([
                'message' => 'Acesso não autorizado. Perfil de Entregador exigido.',
            ], 403);
        }

        return $next($request);
    }
}
