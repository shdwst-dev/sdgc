<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('roles')
            ->where('nombre', 'Super Admin')
            ->exists();

        if (!$exists) {
            DB::table('roles')->insert([
                'nombre' => 'Super Admin',
            ]);
        }
    }

    public function down(): void
    {
        DB::table('roles')
            ->where('nombre', 'Super Admin')
            ->delete();
    }
};
