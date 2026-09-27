import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { RouteMapPreview } from '../../src/components/RouteMapPreview';
import {
  orderService,
  GeocodeResult,
  EstimateResponse,
} from '../../src/services/orderService';

export default function CreateOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Origem (Padrão: Loja do Lojista cadastrada)
  const defaultOriginAddress = user?.client?.default_address || 'Centro, Guarapuava - PR';
  const defaultOriginLat = Number(user?.client?.default_lat) || -25.3954;
  const defaultOriginLng = Number(user?.client?.default_lng) || -51.4641;

  const [originAddress, setOriginAddress] = useState(defaultOriginAddress);
  const [originCoords, setOriginCoords] = useState({
    lat: defaultOriginLat,
    lng: defaultOriginLng,
  });

  // Destino e Geocodificação
  const [destQuery, setDestQuery] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  // Dados do Pacote
  const [packageDescription, setPackageDescription] = useState('');
  const [packageWeight, setPackageWeight] = useState('1.5');
  const [shippingType, setShippingType] = useState<'economic' | 'express'>('economic');

  // Estimativa OSRM e Precificação
  const [estimateData, setEstimateData] = useState<EstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce para geocodificação do destino
  useEffect(() => {
    if (!destQuery || destQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingGeocode(true);
        const results = await orderService.geocode(destQuery);
        setSuggestions(results);
      } catch (err) {
        console.warn('Erro na geocodificação:', err);
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [destQuery]);

  // Recalcula estimativa de rota e frete sempre que origem, destino, peso ou modalidade mudarem
  useEffect(() => {
    if (!destCoords) {
      setEstimateData(null);
      return;
    }

    let isCurrent = true;

    async function fetchEstimate() {
      try {
        setIsEstimating(true);
        const response = await orderService.estimate({
          origin_lat: originCoords.lat,
          origin_lng: originCoords.lng,
          dest_lat: destCoords!.lat,
          dest_lng: destCoords!.lng,
          package_weight_kg: parseFloat(packageWeight) || 1.0,
          shipping_type: shippingType,
        });

        if (isCurrent) {
          setEstimateData(response);
        }
      } catch (err) {
        console.warn('Erro ao estimar rota:', err);
      } finally {
        if (isCurrent) {
          setIsEstimating(false);
        }
      }
    }

    fetchEstimate();

    return () => {
      isCurrent = false;
    };
  }, [originCoords, destCoords, packageWeight, shippingType]);

  function handleSelectDestination(item: GeocodeResult) {
    setDestAddress(item.display_name);
    setDestCoords({ lat: item.lat, lng: item.lng });
    setDestQuery('');
    setSuggestions([]);
  }

  async function handleCreateOrder() {
    if (!destCoords || !destAddress) {
      Alert.alert('Atenção', 'Por favor, selecione um endereço de entrega válido.');
      return;
    }

    if (!packageDescription.trim()) {
      Alert.alert('Atenção', 'Informe a descrição do pacote a ser transportado.');
      return;
    }

    const weightNum = parseFloat(packageWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Atenção', 'Informe um peso válido (maior que zero).');
      return;
    }

    try {
      setIsSubmitting(true);
      await orderService.create({
        package_description: packageDescription.trim(),
        package_weight_kg: weightNum,
        shipping_type: shippingType,
        origin_address: originAddress,
        dest_address: destAddress,
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        dest_lat: destCoords.lat,
        dest_lng: destCoords.lng,
      });

      Alert.alert('Sucesso! 🎉', 'Pedido de entrega emitido com sucesso!', [
        {
          text: 'Ver Meus Pedidos',
          onPress: () => router.push('/(client)/orders'),
        },
      ]);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || 'Falha ao criar pedido. Tente novamente.';
      Alert.alert('Erro', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Novo Pedido de Entrega</Text>
          <Text style={styles.pageSubtitle}>
            Cotação viária em tempo real via OSRM com geocodificação inteligente em Guarapuava.
          </Text>
        </View>

        {/* 1. Endereço de Coleta (Origem) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardIcon}>🏬</Text>
            <Text style={styles.cardTitle}>Ponto de Coleta (Loja)</Text>
          </View>
          <TextInput
            style={styles.inputDisabled}
            value={originAddress}
            editable={false}
            placeholder="Endereço de coleta"
          />
          <Text style={styles.inputHint}>
            📍 Coordenadas: {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
          </Text>
        </View>

        {/* 2. Endereço de Entrega (Destino com Busca Debounced) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Endereço de Destino (Cliente)</Text>
          </View>

          {destAddress ? (
            <View style={styles.selectedDestBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedDestLabel}>Destino Definido:</Text>
                <Text style={styles.selectedDestText}>{destAddress}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDestAddress('');
                  setDestCoords(null);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Alterar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Digite rua, bairro ou local em Guarapuava..."
                value={destQuery}
                onChangeText={setDestQuery}
                testID="destination-search-input"
              />

              {isSearchingGeocode && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Buscando coordenadas em Guarapuava...</Text>
                </View>
              )}

              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectDestination(item)}
                      testID={`suggestion-item-${index}`}
                    >
                      <Text style={styles.suggestionIcon}>📌</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{item.street || item.display_name}</Text>
                        <Text style={styles.suggestionSubtitle}>
                          {item.neighborhood ? `${item.neighborhood}, ` : ''}{item.city} - {item.state}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* 3. Dados do Pacote (Cubagem e Peso - RF 02) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Dados do Pacote</Text>
          </View>

          <Text style={styles.fieldLabel}>Descrição do Item *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Peças automotivas, Remédios, Refeições..."
            value={packageDescription}
            onChangeText={setPackageDescription}
            testID="package-description-input"
          />

          <View style={styles.rowTwoCols}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Peso Aproximado (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 2.0"
                keyboardType="numeric"
                value={packageWeight}
                onChangeText={setPackageWeight}
                testID="package-weight-input"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Porte / Volume</Text>
              <View style={styles.volumeBadge}>
                <Text style={styles.volumeText}>
                  {parseFloat(packageWeight) > 5 ? '📦 Grande (> 5kg)' : '✉️ Padrão / Leve'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Seletor de Modalidade (Expressa vs Econômica) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardTitle}>Modalidade de Frete</Text>
          </View>

          <View style={styles.modalityRow}>
            {/* Econômica */}
            <TouchableOpacity
              style={[
                styles.modalityCard,
                shippingType === 'economic' && styles.modalityCardActive,
              ]}
              onPress={() => setShippingType('economic')}
              activeOpacity={0.8}
              testID="modality-economic-button"
            >
              <View style={styles.modalityTop}>
                <Text style={styles.modalityIcon}>🌱</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>-20% Rateio</Text>
                </View>
              </View>
              <Text style={styles.modalityTitle}>Econômica</Text>
              <Text style={styles.modalityDesc}>
                Coleta no lote compartilhado com economia cooperativa 50/50.
              </Text>
            </TouchableOpacity>

            {/* Expressa */}
            <TouchableOpacity
              style={[
                styles.modalityCard,
                shippingType === 'express' && styles.modalityCardActive,
              ]}
              onPress={() => setShippingType('express')}
              activeOpacity={0.8}
              testID="modality-express-button"
            >
              <View style={styles.modalityTop}>
                <Text style={styles.modalityIcon}>⚡</Text>
                <View style={styles.instantPill}>
                  <Text style={styles.instantPillText}>Sob Demanda</Text>
                </View>
              </View>
              <Text style={styles.modalityTitle}>Expressa</Text>
              <Text style={styles.modalityDesc}>
                Envio imediato e exclusivo para motoboy disponível agora.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Mapa Interativo com Traçado OSRM */}
        <RouteMapPreview
          origin={
            originCoords
              ? {
                  latitude: originCoords.lat,
                  longitude: originCoords.lng,
                  title: 'Ponto de Coleta',
                  description: originAddress,
                }
              : null
          }
          destination={
            destCoords
              ? {
                  latitude: destCoords.lat,
                  longitude: destCoords.lng,
                  title: 'Ponto de Entrega',
                  description: destAddress,
                }
              : null
          }
          polyline={estimateData?.route?.polyline_geometry}
          height={210}
        />

        {/* 6. Card Resumo de Cotação */}
        {isEstimating ? (
          <View style={[styles.quoteCard, SHADOWS.md]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.quoteEstimatingText}>
              Calculando melhor trajeto e tarifa viária no OSRM...
            </Text>
          </View>
        ) : estimateData ? (
          <View style={[styles.quoteCard, SHADOWS.md]}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTitle}>Resumo da Cotação</Text>
              <View style={styles.osrmBadge}>
                <Text style={styles.osrmBadgeText}>⚡ OSRM UTFPR</Text>
              </View>
            </View>

            <View style={styles.quoteStatsRow}>
              <View style={styles.quoteStatItem}>
                <Text style={styles.quoteStatLabel}>Distância Viária</Text>
                <Text style={styles.quoteStatValue}>
                  {estimateData.route.distance_km} km
                </Text>
              </View>
              <View style={styles.quoteStatDivider} />
              <View style={styles.quoteStatItem}>
                <Text style={styles.quoteStatLabel}>Tempo Estimado</Text>
                <Text style={styles.quoteStatValue}>
                  ~{estimateData.route.duration_minutes} min
                </Text>
              </View>
              <View style={styles.quoteStatDivider} />
              <View style={styles.quoteStatItem}>
                <Text style={styles.quoteStatLabel}>Valor do Frete</Text>
                <Text style={styles.quotePriceValue}>
                  R$ {estimateData.pricing.individual_price.toFixed(2)}
                </Text>
              </View>
            </View>

            {shippingType === 'economic' && (
              <View style={styles.economicBanner}>
                <Text style={styles.economicBannerIcon}>💡</Text>
                <Text style={styles.economicBannerText}>
                  Previsão no lote: <Text style={{ fontWeight: 'bold' }}>R$ {estimateData.pricing.estimated_final_price.toFixed(2)}</Text> com rateio 50/50.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* 7. Botão de Emissão do Pedido */}
        <View style={styles.submitContainer}>
          <Button
            title={isSubmitting ? 'Emitindo Pedido...' : 'Emitir Pedido de Frete'}
            onPress={handleCreateOrder}
            disabled={!destCoords || isSubmitting}
            testID="submit-order-button"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: SPACING.md,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  inputHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  selectedDestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  selectedDestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectedDestText: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  suggestionsBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  suggestionIcon: {
    fontSize: 14,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: SPACING.xs,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  volumeBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  modalityCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  modalityCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  modalityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  modalityIcon: {
    fontSize: 20,
  },
  discountPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  instantPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  instantPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  modalityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalityDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  quoteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  osrmBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  osrmBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quoteStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  quoteStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quoteStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  quoteStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  quoteStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  quotePriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  quoteEstimatingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  economicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  economicBannerIcon: {
    fontSize: 14,
  },
  economicBannerText: {
    fontSize: 12,
    color: '#065F46',
  },
  submitContainer: {
    marginTop: SPACING.sm,
  },
});
