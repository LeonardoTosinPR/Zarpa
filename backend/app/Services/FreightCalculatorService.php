<?php

namespace App\Services;

class FreightCalculatorService
{
    // Parâmetros de Precificação Base (Guarapuava - PR)
    public const BASE_FEE = 6.00;              // R$ 6,00 tarifa de partida
    public const PRICE_PER_KM = 2.50;          // R$ 2,50 por quilômetro rodado
    public const WEIGHT_THRESHOLD_KG = 5.00;   // Limite sem sobretaxa de peso (até 5kg)
    public const OVERWEIGHT_FEE_PER_KG = 1.50; // R$ 1,50 por kg adicional acima do limite
    public const ECONOMIC_ESTIMATED_DISCOUNT = 0.20; // 20% de economia projetada no rateio 50/50

    /**
     * Calcula a cotação de frete detalhada para o pedido.
     *
     * @param float $distanceKm Distância viária percorrida em quilômetros
     * @param float $weightKg Peso total do pacote em quilogramas
     * @param string $shippingType 'express' ou 'economic'
     * @return array
     */
    public function calculate(float $distanceKm, float $weightKg = 1.0, string $shippingType = 'economic'): array
    {
        $safeDistance = max(0.5, $distanceKm);
        $safeWeight = max(0.1, $weightKg);

        // 1. Custo por distância
        $distanceCost = round($safeDistance * self::PRICE_PER_KM, 2);

        // 2. Sobretaxa de peso excedente
        $overweightKg = max(0.0, $safeWeight - self::WEIGHT_THRESHOLD_KG);
        $weightCost = round($overweightKg * self::OVERWEIGHT_FEE_PER_KG, 2);

        // 3. Preço individual integral
        $individualPrice = round(self::BASE_FEE + $distanceCost + $weightCost, 2);

        // 4. Regras por modalidade
        $isEconomic = ($shippingType === 'economic');
        $estimatedDiscount = $isEconomic ? round($individualPrice * self::ECONOMIC_ESTIMATED_DISCOUNT, 2) : 0.00;
        $estimatedFinalPrice = $isEconomic ? round($individualPrice - $estimatedDiscount, 2) : $individualPrice;

        return [
            'base_fee' => self::BASE_FEE,
            'price_per_km' => self::PRICE_PER_KM,
            'distance_km' => $safeDistance,
            'distance_cost' => $distanceCost,
            'weight_kg' => $safeWeight,
            'overweight_kg' => $overweightKg,
            'weight_cost' => $weightCost,
            'shipping_type' => $shippingType,
            'individual_price' => $individualPrice,
            'estimated_discount' => $estimatedDiscount,
            'estimated_final_price' => $estimatedFinalPrice,
            'estimated_savings_percent' => $isEconomic ? (int)(self::ECONOMIC_ESTIMATED_DISCOUNT * 100) : 0,
            'modalities' => [
                'express' => [
                    'title' => 'Expressa (⚡ Imediato)',
                    'price' => $individualPrice,
                    'description' => 'Envio imediato exclusivo para motoboy sob demanda.',
                    'savings' => 0.00,
                ],
                'economic' => [
                    'title' => 'Econômica (🌱 Compartilhado)',
                    'price' => $individualPrice,
                    'projected_price' => round($individualPrice * (1 - self::ECONOMIC_ESTIMATED_DISCOUNT), 2),
                    'projected_savings' => $estimatedDiscount,
                    'description' => 'Coleta programada com agrupamento noturno e desconto de rateio 50/50.',
                ],
            ],
        ];
    }
}
