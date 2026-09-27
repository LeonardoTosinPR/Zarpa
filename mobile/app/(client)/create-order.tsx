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
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
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

  // Dados cadastrados da Loja do Lojista
  const storeAddress = user?.client?.default_address || 'Centro, Guarapuava - PR';
  const storeLat = Number(user?.client?.default_lat) || -25.3954;
  const storeLng = Number(user?.client?.default_lng) || -51.4641;

  // Origem: inicia vazia conforme solicitado pelo usuário
  const [originAddress, setOriginAddress] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originType, setOriginType] = useState<'store' | 'current' | 'custom' | null>(null);
  const [isLocatingOrigin, setIsLocatingOrigin] = useState(false);

  // Busca e digitação manual do endereço de coleta (Origem)
  const [originQuery, setOriginQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearchingOriginGeocode, setIsSearchingOriginGeocode] = useState(false);

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

  // 1. Seleção da Origem: Endereço da Loja
  function handleSelectStoreOrigin() {
    setOriginAddress(storeAddress);
    setOriginCoords({
      lat: storeLat,
      lng: storeLng,
    });
    setOriginType('store');
    setOriginQuery('');
    setOriginSuggestions([]);
  }

  // 2. Seleção da Origem: Localização Atual via GPS físico do dispositivo
  async function handleSelectCurrentLocation() {
    try {
      setIsLocatingOrigin(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso à localização para utilizar sua posição atual como ponto de coleta.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setOriginCoords({ lat, lng });
      setOriginType('current');

      // Tenta obter o logradouro via reverse geocoding nativo do próprio dispositivo
      let friendlyAddress = '';
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (reverseResults && reverseResults.length > 0) {
          const item = reverseResults[0];
          const street = [item.street, item.streetNumber].filter(Boolean).join(', ') || item.name || '';
          const district = item.district || item.subregion || '';
          const city = item.city || 'Guarapuava';
          const parts = [street, district, city].filter(Boolean);
          if (parts.length > 0) {
            friendlyAddress = parts.join(' - ');
          }
        }
      } catch (err) {
        console.warn('Erro no reverse geocode nativo:', err);
      }

      if (!friendlyAddress) {
        friendlyAddress = `Minha Localização Atual (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      }

      setOriginAddress(friendlyAddress);
      setOriginQuery('');
      setOriginSuggestions([]);
    } catch (err) {
      console.warn('Erro ao obter localização do dispositivo:', err);
      Alert.alert('Erro', 'Não foi possível obter a localização do dispositivo.');
    } finally {
      setIsLocatingOrigin(false);
    }
  }

  // 3. Seleção da Origem via sugestão de endereço digitado
  function handleSelectOriginSuggestion(item: GeocodeResult) {
    setOriginAddress(item.display_name);
    setOriginCoords({ lat: item.lat, lng: item.lng });
    setOriginType('custom');
    setOriginQuery('');
    setOriginSuggestions([]);
  }

  function handleClearOrigin() {
    setOriginAddress('');
    setOriginCoords(null);
    setOriginType(null);
    setOriginQuery('');
    setOriginSuggestions([]);
  }

  // Debounce para geocodificação da origem digitada
  useEffect(() => {
    if (!originQuery || originQuery.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingOriginGeocode(true);
        const results = await orderService.geocode(originQuery);
        setOriginSuggestions(results);
      } catch (err) {
        console.warn('Erro na geocodificação de origem:', err);
      } finally {
        setIsSearchingOriginGeocode(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [originQuery]);

  // Debounce para geocodificação do destino digitado
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

  // Recalcula estimativa de rota e frete sempre que ambos os pontos, peso ou modalidade mudarem
  useEffect(() => {
    if (!originCoords || !destCoords) {
      setEstimateData(null);
      return;
    }

    let isCurrent = true;

    async function fetchEstimate() {
      try {
        setIsEstimating(true);
        const response = await orderService.estimate({
          origin_lat: originCoords!.lat,
          origin_lng: originCoords!.lng,
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
    if (!originCoords || !originAddress) {
      Alert.alert('Atenção', 'Selecione ou digite o ponto de coleta da entrega.');
      return;
    }

    if (!destCoords || !destAddress) {
      Alert.alert('Atenção', 'Selecione um endereço de entrega válido.');
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

      Alert.alert('Sucesso', 'Pedido de entrega emitido com sucesso!', [
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

        {/* 1. Endereço de Coleta (Origem com Seletor e Campo de Digitação) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="business-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Ponto de Coleta (Origem)</Text>
          </View>

          {originCoords && originAddress ? (
            <View style={styles.selectedOriginBox}>
              <View style={{ flex: 1 }}>
                <View style={styles.originTypePill}>
                  <Text style={styles.originTypePillText}>
                    {originType === 'current'
                      ? 'Localização Atual (GPS)'
                      : originType === 'store'
                      ? 'Endereço da Loja'
                      : 'Endereço Informado'}
                  </Text>
                </View>
                <Text style={styles.selectedOriginText}>{originAddress}</Text>
                <Text style={styles.inputHint}>
                  Coordenadas: {originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearOrigin}
                style={styles.clearBtn}
                testID="clear-origin-button"
              >
                <Text style={styles.clearBtnText}>Alterar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.originSelectionContainer}>
              <Text style={styles.originPromptText}>
                Selecione ou digite o local de partida da entrega:
              </Text>

              {/* Botões rápidos: GPS e Loja */}
              <View style={styles.originOptionsRow}>
                {/* Opção 1: Localização Atual */}
                <TouchableOpacity
                  style={[styles.originOptionCard, isLocatingOrigin && styles.originOptionDisabled]}
                  onPress={handleSelectCurrentLocation}
                  disabled={isLocatingOrigin}
                  activeOpacity={0.7}
                  testID="origin-current-location-button"
                >
                  {isLocatingOrigin ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 4 }} />
                  ) : (
                    <Ionicons name="navigate-outline" size={20} color={COLORS.primary} style={{ marginBottom: 4 }} />
                  )}
                  <Text style={styles.originOptionTitle}>Localização Atual</Text>
                  <Text style={styles.originOptionDesc}>GPS do aparelho</Text>
                </TouchableOpacity>

                {/* Opção 2: Endereço da Loja */}
                <TouchableOpacity
                  style={styles.originOptionCard}
                  onPress={handleSelectStoreOrigin}
                  activeOpacity={0.7}
                  testID="origin-store-address-button"
                >
                  <Ionicons name="storefront-outline" size={20} color={COLORS.primary} style={{ marginBottom: 4 }} />
                  <Text style={styles.originOptionTitle}>Endereço da Loja</Text>
                  <Text style={styles.originOptionDesc} numberOfLines={1}>
                    {storeAddress}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Opção 3: Digitar Endereço de Coleta Manualmente */}
              <View style={styles.originManualSection}>
                <Text style={styles.originManualLabel}>Ou digite o endereço de coleta:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite rua, bairro ou local de coleta..."
                  value={originQuery}
                  onChangeText={setOriginQuery}
                  testID="origin-search-input"
                />

                {isSearchingOriginGeocode && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Buscando endereço em Guarapuava...</Text>
                  </View>
                )}

                {originSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {originSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectOriginSuggestion(item)}
                        testID={`origin-suggestion-item-${index}`}
                      >
                        <Ionicons name="location-sharp" size={16} color={COLORS.textMuted} />
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
              </View>
            </View>
          )}
        </View>

        {/* 2. Endereço de Entrega (Destino com Busca Debounced) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.accent} />
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
                testID="clear-destination-button"
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
                      <Ionicons name="location-sharp" size={16} color={COLORS.textMuted} />
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
            <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
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
                  {parseFloat(packageWeight) > 5 ? 'Carga Pesada (> 5kg)' : 'Padrão / Leve'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Seletor de Modalidade (Expressa vs Econômica) */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
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
                <Text style={[styles.modalityTag, shippingType === 'economic' && styles.modalityTagActive]}>
                  ECONÔMICA
                </Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>-20% Rateio</Text>
                </View>
              </View>
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
                <Text style={[styles.modalityTag, shippingType === 'express' && styles.modalityTagActive]}>
                  EXPRESSA
                </Text>
                <View style={styles.instantPill}>
                  <Text style={styles.instantPillText}>Sob Demanda</Text>
                </View>
              </View>
              <Text style={styles.modalityDesc}>
                Envio imediato e exclusivo para entregador disponível agora.
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
              Calculando trajeto e tarifa viária no OSRM...
            </Text>
          </View>
        ) : estimateData ? (
          <View style={[styles.quoteCard, SHADOWS.md]}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTitle}>Resumo da Cotação</Text>
              <View style={styles.osrmBadge}>
                <Text style={styles.osrmBadgeText}>OSRM UTFPR</Text>
              </View>
            </View>

            <View style={styles.quoteStatsRow}>
              <View style={styles.quoteStatItem}>
                <Text style={styles.quoteStatLabel}>Distância</Text>
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
                <Text style={styles.economicBannerText}>
                  Previsão no lote cooperativo: <Text style={{ fontWeight: '700' }}>R$ {estimateData.pricing.estimated_final_price.toFixed(2)}</Text> com rateio 50/50.
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
            disabled={!originCoords || !destCoords || isSubmitting}
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
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  originSelectionContainer: {
    marginTop: SPACING.xs,
  },
  originPromptText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  originOptionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  originOptionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originOptionDisabled: {
    opacity: 0.6,
  },
  originOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  originOptionDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  originManualSection: {
    marginTop: SPACING.md,
  },
  originManualLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  selectedOriginBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  originTypePill: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: 4,
  },
  originTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  selectedOriginText: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  modalityTag: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  modalityTagActive: {
    color: COLORS.primary,
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
    backgroundColor: '#ECFDF5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  economicBannerText: {
    fontSize: 12,
    color: '#065F46',
  },
  submitContainer: {
    marginTop: SPACING.sm,
  },
});
