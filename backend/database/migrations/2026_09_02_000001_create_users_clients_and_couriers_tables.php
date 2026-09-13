<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Users table
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('client'); // 'client', 'courier', 'admin'
            $table->string('phone')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Personal Access Tokens table (Sanctum)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 3. Clients (Lojistas) table
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')->unique();
            $table->string('business_name');
            $table->string('cnpj_cpf');
            $table->string('default_address')->nullable();
            $table->decimal('default_lat', 10, 8)->nullable();
            $table->decimal('default_lng', 11, 8)->nullable();
            $table->timestamps();
        });

        // Add PostGIS geometry column for clients
        DB::statement("ALTER TABLE clients ADD COLUMN IF NOT EXISTS default_location geometry(Point, 4326);");
        DB::statement("CREATE INDEX IF NOT EXISTS clients_default_location_gist ON clients USING GIST (default_location);");

        // 4. Couriers (Entregadores) table
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')->unique();
            $table->string('cnh');
            $table->string('vehicle_type')->default('motorcycle'); // 'motorcycle', 'bicycle', 'car'
            $table->string('vehicle_plate')->nullable();
            $table->decimal('current_lat', 10, 8)->nullable();
            $table->decimal('current_lng', 11, 8)->nullable();
            $table->decimal('cluster_radius_km', 5, 2)->default(5.00);
            $table->boolean('is_online')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Add PostGIS geometry column for couriers
        DB::statement("ALTER TABLE couriers ADD COLUMN IF NOT EXISTS current_location geometry(Point, 4326);");
        DB::statement("CREATE INDEX IF NOT EXISTS couriers_current_location_gist ON couriers USING GIST (current_location);");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('couriers');
        Schema::dropIfExists('clients');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('users');
    }
};
