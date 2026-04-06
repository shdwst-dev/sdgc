<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            if (!Schema::hasColumn('usuarios', 'requiere_cambio_contrasena')) {
                $table->boolean('requiere_cambio_contrasena')->default(false)->after('contrasena');
            }

            if (!Schema::hasColumn('usuarios', 'contrasena_temporal_generada_en')) {
                $table->timestamp('contrasena_temporal_generada_en')->nullable()->after('requiere_cambio_contrasena');
            }
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            if (Schema::hasColumn('usuarios', 'contrasena_temporal_generada_en')) {
                $table->dropColumn('contrasena_temporal_generada_en');
            }

            if (Schema::hasColumn('usuarios', 'requiere_cambio_contrasena')) {
                $table->dropColumn('requiere_cambio_contrasena');
            }
        });
    }
};
