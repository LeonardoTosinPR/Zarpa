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
        Schema::create('delivery_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->date('scheduled_date');
            $table->decimal('total_distance_km', 8, 2)->default(0.00);
            $table->integer('total_duration_minutes')->default(0);
            $table->string('status')->default('created'); // 'created', 'assigned', 'in_progress', 'completed', 'canceled'
            $table->decimal('total_combined_cost', 8, 2)->default(0.00);
            $table->decimal('total_savings_generated', 8, 2)->default(0.00);
            $table->decimal('courier_bonus', 8, 2)->default(0.00);
            $table->longText('route_geometry')->nullable(); // Polilinha unificada de todas as paradas do lote
            $table->timestamps();

            $table->index('scheduled_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_groups');
    }
};
