<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_code', 6)->nullable()->after('proof_photo_url');
        });

        // Gera código de 6 dígitos para pedidos já aceitos ou em lotes econômicos existentes
        $orders = \Illuminate\Support\Facades\DB::table('orders')
            ->whereIn('status', ['assigned', 'picked_up', 'delivered'])
            ->whereNull('delivery_code')
            ->get(['id']);

        foreach ($orders as $order) {
            \Illuminate\Support\Facades\DB::table('orders')
                ->where('id', $order->id)
                ->update([
                    'delivery_code' => str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivery_code');
        });
    }
};
