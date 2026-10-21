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
            $table->timestamp('assigned_at')->nullable()->after('status');
            $table->timestamp('picked_up_at')->nullable()->after('assigned_at');
        });

        Schema::table('group_orders', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('stop_type'); // 'pending', 'completed'
            $table->timestamp('completed_at')->nullable()->after('status');
            
            $table->index(['delivery_group_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_orders', function (Blueprint $table) {
            $table->dropIndex(['delivery_group_id', 'status']);
            $table->dropColumn(['status', 'completed_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['assigned_at', 'picked_up_at']);
        });
    }
};

