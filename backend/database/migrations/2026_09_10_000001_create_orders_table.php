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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->onDelete('set null');
            
            // Especificações do Pacote
            $table->string('package_description');
            $table->decimal('package_weight_kg', 8, 2)->default(1.00);
            $table->decimal('package_volume_m3', 8, 4)->nullable();

            // Modalidade e Ciclo de Vida
            $table->string('shipping_type')->default('economic'); // 'express', 'economic'
            $table->string('status')->default('pending'); // 'pending', 'assigned', 'picked_up', 'delivered', 'canceled'
            $table->boolean('is_anchor')->default(false);

            // Valores de Frete e Roteamento
            $table->decimal('individual_freight_price', 8, 2);
            $table->decimal('final_freight_price', 8, 2)->nullable();
            $table->decimal('distance_km', 8, 2);
            $table->integer('estimated_duration_minutes')->default(0);
            $table->text('route_geometry')->nullable(); // Polyline codificada do percurso

            // Comprovante de Entrega
            $table->string('proof_photo_url')->nullable();
            $table->timestamp('delivered_at')->nullable();

            // Endereços Textuais e Coordenadas Numéricas
            $table->string('origin_address');
            $table->string('dest_address');
            $table->decimal('origin_lat', 10, 8);
            $table->decimal('origin_lng', 11, 8);
            $table->decimal('dest_lat', 10, 8);
            $table->decimal('dest_lng', 11, 8);

            $table->timestamps();
        });

        // Colunas e Índices Espaciais PostGIS (SRID 4326 - WGS 84)
        DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin_location geometry(Point, 4326);");
        DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS dest_location geometry(Point, 4326);");
        DB::statement("CREATE INDEX IF NOT EXISTS orders_origin_location_gist ON orders USING GIST (origin_location);");
        DB::statement("CREATE INDEX IF NOT EXISTS orders_dest_location_gist ON orders USING GIST (dest_location);");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
