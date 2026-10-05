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
        Schema::create('group_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_group_id')->constrained('delivery_groups')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->integer('stop_sequence'); // 1 a N
            $table->string('stop_type'); // 'pickup', 'delivery'
            $table->decimal('isolated_distance_km', 8, 2)->default(0.00);
            $table->decimal('shared_distance_km', 8, 2)->default(0.00);
            $table->decimal('allocated_cost', 8, 2)->default(0.00);
            $table->decimal('merchant_discount', 8, 2)->default(0.00);
            $table->timestamps();

            $table->index(['delivery_group_id', 'stop_sequence']);
            $table->index(['order_id', 'stop_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_orders');
    }
};
