<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (!Schema::hasColumn('ventas', 'id_tienda')) {
                $table->unsignedInteger('id_tienda')->nullable()->after('id_metodo_pago');
                $table->foreign('id_tienda')->references('id_tienda')->on('tiendas');
                $table->index('id_tienda');
            }
        });

        Schema::table('compras', function (Blueprint $table) {
            if (!Schema::hasColumn('compras', 'id_tienda')) {
                $table->unsignedInteger('id_tienda')->nullable()->after('id_proveedor');
                $table->foreign('id_tienda')->references('id_tienda')->on('tiendas');
                $table->index('id_tienda');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'id_tienda')) {
                $table->dropForeign(['id_tienda']);
                $table->dropIndex(['id_tienda']);
                $table->dropColumn('id_tienda');
            }
        });

        Schema::table('compras', function (Blueprint $table) {
            if (Schema::hasColumn('compras', 'id_tienda')) {
                $table->dropForeign(['id_tienda']);
                $table->dropIndex(['id_tienda']);
                $table->dropColumn('id_tienda');
            }
        });
    }
};
