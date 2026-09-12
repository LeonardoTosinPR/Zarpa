<?php

use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(UserSeeder::class);
});

test('can register a new client with merchant profile and coordinates', function () {
    $payload = [
        'name' => 'Supermercado Silva',
        'email' => 'silva@mercado.com',
        'password' => 'secret123456',
        'role' => 'client',
        'phone' => '(42) 99123-4567',
        'business_name' => 'Silva Alimentos Ltda',
        'cnpj_cpf' => '98.765.432/0001-10',
        'default_address' => 'Rua XV de Novembro, 500 - Guarapuava',
        'default_lat' => -25.39120000,
        'default_lng' => -51.46350000,
    ];

    $response = $this->postJson('/api/auth/register', $payload);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'message',
                 'token',
                 'user' => [
                     'id',
                     'name',
                     'email',
                     'role',
                     'client' => [
                         'id',
                         'business_name',
                         'cnpj_cpf',
                         'default_address',
                     ],
                 ],
             ]);

    $this->assertDatabaseHas('users', [
        'email' => 'silva@mercado.com',
        'role' => 'client',
    ]);

    $this->assertDatabaseHas('clients', [
        'business_name' => 'Silva Alimentos Ltda',
        'cnpj_cpf' => '98.765.432/0001-10',
    ]);
});

test('can register a new courier with vehicle and driver license', function () {
    $payload = [
        'name' => 'Lucas Entregador',
        'email' => 'lucas@courier.com',
        'password' => 'courier123456',
        'role' => 'courier',
        'phone' => '(42) 99888-7766',
        'cnh' => '99887766554',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'LUC1A23',
        'cluster_radius_km' => 7.5,
        'current_lat' => -25.39800000,
        'current_lng' => -51.46500000,
    ];

    $response = $this->postJson('/api/auth/register', $payload);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'message',
                 'token',
                 'user' => [
                     'id',
                     'name',
                     'email',
                     'role',
                     'courier' => [
                         'id',
                         'cnh',
                         'vehicle_type',
                         'vehicle_plate',
                     ],
                 ],
             ]);

    $this->assertDatabaseHas('users', [
        'email' => 'lucas@courier.com',
        'role' => 'courier',
    ]);

    $this->assertDatabaseHas('couriers', [
        'cnh' => '99887766554',
        'vehicle_plate' => 'LUC1A23',
    ]);
});

test('registration validates required fields according to role', function () {
    $response = $this->postJson('/api/auth/register', [
        'name' => 'Incomplete User',
        'email' => 'invalid-email',
        'password' => '123', // too short
        'role' => 'client',
        // missing business_name & cnpj_cpf
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['email', 'password', 'business_name', 'cnpj_cpf']);
});

test('user can login successfully with seeded test credentials', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'lojista@zarpa.com.br',
        'password' => 'lojista123456',
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'message',
                 'token',
                 'user' => [
                     'id',
                     'name',
                     'email',
                     'role',
                     'client',
                 ],
             ]);
});

test('admin can login successfully and has full access', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'admin@zarpa.com.br',
        'password' => 'admin123456',
    ]);

    $response->assertStatus(200)
             ->assertJsonPath('user.role', 'admin');
});

test('login fails with invalid password', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'lojista@zarpa.com.br',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(401)
             ->assertJson([
                 'message' => 'Credenciais inválidas. Verifique seu e-mail e senha.',
             ]);
});

test('authenticated user can fetch me profile and logout', function () {
    $user = User::where('email', 'entregador@zarpa.com.br')->first();
    $token = $user->createToken('test-token')->plainTextToken;

    // 1. Fetch Me
    $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
                       ->getJson('/api/auth/me');

    $meResponse->assertStatus(200)
               ->assertJsonPath('user.email', 'entregador@zarpa.com.br')
               ->assertJsonStructure(['user' => ['courier']]);

    // 2. Logout
    $logoutResponse = $this->withHeader('Authorization', "Bearer {$token}")
                           ->postJson('/api/auth/logout');

    $logoutResponse->assertStatus(200)
                   ->assertJson(['message' => 'Logout realizado com sucesso.']);
});

test('role middleware isolates client and courier access properly', function () {
    $client = User::where('email', 'lojista@zarpa.com.br')->first();
    $clientToken = $client->createToken('client-token')->plainTextToken;

    $courier = User::where('email', 'entregador@zarpa.com.br')->first();
    $courierToken = $courier->createToken('courier-token')->plainTextToken;

    $admin = User::where('email', 'admin@zarpa.com.br')->first();
    $adminToken = $admin->createToken('admin-token')->plainTextToken;

    // Client accesses client route -> 200
    \Laravel\Sanctum\Sanctum::actingAs($client);
    $this->getJson('/api/client/profile')
         ->assertStatus(200);

    // Client accesses courier route -> 403 Forbidden
    $this->getJson('/api/courier/profile')
         ->assertStatus(403);

    // Courier accesses courier route -> 200
    \Laravel\Sanctum\Sanctum::actingAs($courier);
    $this->getJson('/api/courier/profile')
         ->assertStatus(200);

    // Courier accesses client route -> 403 Forbidden
    $this->getJson('/api/client/profile')
         ->assertStatus(403);

    // Admin accesses both -> 200
    \Laravel\Sanctum\Sanctum::actingAs($admin);
    $this->getJson('/api/client/profile')
         ->assertStatus(200);

    $this->getJson('/api/courier/profile')
         ->assertStatus(200);
});
