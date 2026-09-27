<?php

use App\Services\FreightCalculatorService;

test('calculates freight accurately for standard package without overweight', function () {
    $calculator = new FreightCalculatorService();

    // 10 km, 2 kg, economic
    $result = $calculator->calculate(10.0, 2.0, 'economic');

    // Base: 6.00 + (10 * 2.50) = 31.00
    expect($result['base_fee'])->toBe(6.00)
        ->and($result['distance_cost'])->toBe(25.00)
        ->and($result['weight_cost'])->toBe(0.00)
        ->and($result['individual_price'])->toBe(31.00)
        ->and($result['shipping_type'])->toBe('economic')
        ->and($result['estimated_discount'])->toBe(6.20) // 20% de 31.00
        ->and($result['estimated_final_price'])->toBe(24.80);
});

test('calculates freight with overweight fee when package exceeds 5kg', function () {
    $calculator = new FreightCalculatorService();

    // 10 km, 8 kg (3 kg overweight), express
    $result = $calculator->calculate(10.0, 8.0, 'express');

    // Base (6.00) + Distance (25.00) + Overweight (3 * 1.50 = 4.50) = 35.50
    expect($result['overweight_kg'])->toBe(3.0)
        ->and($result['weight_cost'])->toBe(4.50)
        ->and($result['individual_price'])->toBe(35.50)
        ->and($result['shipping_type'])->toBe('express')
        ->and($result['estimated_discount'])->toBe(0.00)
        ->and($result['estimated_final_price'])->toBe(35.50);
});
