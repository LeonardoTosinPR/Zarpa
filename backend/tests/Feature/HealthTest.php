<?php

test('healthcheck endpoint returns successful structure', function () {
    $response = $this->getJson('/api/health');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'status',
                 'service',
                 'timestamp',
                 'database' => [
                     'connected',
                     'postgis_enabled',
                 ],
             ]);
});

