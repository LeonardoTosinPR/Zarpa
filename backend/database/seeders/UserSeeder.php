<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Admin Master User
        $admin = User::firstOrCreate(
            ['email' => 'admin@zarpa.com.br'],
            [
                'name' => 'Administrador Zarpa',
                'password' => Hash::make('admin123456'),
                'role' => 'admin',
                'phone' => '(42) 99999-0000',
            ]
        );

        // 2. Test Merchant (Lojista)
        $clientUser = User::firstOrCreate(
            ['email' => 'lojista@zarpa.com.br'],
            [
                'name' => 'Padaria Central',
                'password' => Hash::make('lojista123456'),
                'role' => 'client',
                'phone' => '(42) 98888-1111',
            ]
        );

        Client::firstOrCreate(
            ['user_id' => $clientUser->id],
            [
                'business_name' => 'Padaria Central Guarapuava',
                'cnpj_cpf' => '12.345.678/0001-90',
                'default_address' => 'Rua Saldanha Marinho, 1200 - Centro, Guarapuava - PR',
                'default_lat' => -25.39050000,
                'default_lng' => -51.46280000,
            ]
        );

        // Update PostGIS geometry location for client
        DB::statement("
            UPDATE clients 
            SET default_location = ST_SetSRID(ST_MakePoint(default_lng, default_lat), 4326)
            WHERE user_id = {$clientUser->id} AND default_lat IS NOT NULL AND default_lng IS NOT NULL;
        ");

        // 3. Test Courier (Entregador)
        $courierUser = User::firstOrCreate(
            ['email' => 'entregador@zarpa.com.br'],
            [
                'name' => 'Carlos Motoboy',
                'password' => Hash::make('entregador123456'),
                'role' => 'courier',
                'phone' => '(42) 97777-2222',
            ]
        );

        Courier::firstOrCreate(
            ['user_id' => $courierUser->id],
            [
                'cnh' => '12345678900',
                'vehicle_type' => 'motorcycle',
                'vehicle_plate' => 'BRA2E19',
                'current_lat' => -25.39500000,
                'current_lng' => -51.46000000,
                'cluster_radius_km' => 5.00,
                'is_online' => true,
                'is_active' => true,
            ]
        );

        // Update PostGIS geometry location for courier
        DB::statement("
            UPDATE couriers 
            SET current_location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)
            WHERE user_id = {$courierUser->id} AND current_lat IS NOT NULL AND current_lng IS NOT NULL;
        ");
    }
}
