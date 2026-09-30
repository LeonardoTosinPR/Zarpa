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
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { courierService } from '../../src/services/courierService';

const RADIUS_OPTIONS = [3, 5, 8, 10, 15, 20, 25, 30];

const VEHICLE_OPTIONS: { label: string; value: 'motorcycle' | 'bicycle' | 'car' }[] = [
  { label: 'Motocicleta', value: 'motorcycle' },
  { label: 'Bicicleta', value: 'bicycle' },
  { label: 'Carro', value: 'car' },
];

export default function CourierProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Foto de perfil do condutor
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [radiusKm, setRadiusKm] = useState<number>(
    Number(user?.courier?.cluster_radius_km) || 5.0
  );
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'car'>(
    user?.courier?.vehicle_type || 'motorcycle'
  );
  const [vehiclePlate, setVehiclePlate] = useState(user?.courier?.vehicle_plate || '');
  const [cnh, setCnh] = useState(user?.courier?.cnh || '');

  // Modais de combo-box
  const [isRadiusModalOpen, setIsRadiusModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  // Carrega dados frescos do backend
  useEffect(() => {
    async function loadCourierProfile() {
      try {
        setIsLoading(true);
        const data = await courierService.getProfile();
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone || '');
        }
        if (data.courier) {
          setRadiusKm(Number(data.courier.cluster_radius_km) || 5.0);
          if (data.courier.vehicle_type) {
            setVehicleType(data.courier.vehicle_type);
          }
          setVehiclePlate(data.courier.vehicle_plate || '');
          setCnh(data.courier.cnh || '');
        }
      } catch (err) {
        console.warn('Erro ao carregar perfil do condutor:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCourierProfile();
  }, []);

  // Seleciona foto de perfil da galeria do dispositivo
  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso à galeria para alterar sua foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
        Alert.alert('Sucesso', 'Foto de perfil selecionada com sucesso!');
      }
    } catch (err) {
      console.warn('Erro ao selecionar foto do perfil:', err);
      Alert.alert('Erro', 'Não foi possível carregar a imagem do dispositivo.');
    }
  };

  async function handleSaveProfile() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe seu nome completo.');
      return;
    }

    if (radiusKm < 1 || radiusKm > 50) {
      Alert.alert('Atenção', 'O raio de atuação deve ser entre 1 km e 50 km.');
      return;
    }

    try {
      setIsSaving(true);
      await courierService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        cluster_radius_km: radiusKm,
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate.trim().toUpperCase(),
        cnh: cnh.trim(),
      });

      Alert.alert('Sucesso', 'Perfil e raio de atuação atualizados com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Não foi possível atualizar o perfil.';
      Alert.alert('Erro', msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Encerrar Sessão',
      'Deseja realmente sair da sua conta Zarpa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  }

  const selectedVehicleLabel =
    VEHICLE_OPTIONS.find((v) => v.value === vehicleType)?.label || 'Motocicleta';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando perfil do entregador...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card com Foto Clicável */}
        <View style={[styles.userCard, SHADOWS.sm]}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            testID="profile-avatar-picker-btn"
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarBox}>
                <Ionicons name="person" size={28} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfoBox}>
            <Text style={styles.userName}>{name || 'Entregador Zarpa'}</Text>
            <Text style={styles.userEmail}>{email || user?.email}</Text>
            <View style={styles.roleTag}>
              <Ionicons name="bicycle" size={12} color={COLORS.accentDark} style={{ marginRight: 4 }} />
              <Text style={styles.roleTagText}>Entregador Parceiro • Guarapuava - PR</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Raio de Atuação no Radar em Combo-box */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Raio de Atuação no Radar</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Define a distância máxima (em km) a partir do seu GPS físico para receber chamados em tempo real na região de Guarapuava.
          </Text>

          <Text style={styles.fieldLabel}>Raio Máximo</Text>
          <TouchableOpacity
            style={styles.comboboxButton}
            onPress={() => setIsRadiusModalOpen(true)}
            activeOpacity={0.7}
            testID="courier-radius-combobox"
          >
            <Text style={styles.comboboxValueText}>{radiusKm} km</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 2: Dados do Veículo com Combo-box */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Dados do Veículo</Text>
          </View>

          <Text style={styles.fieldLabel}>Tipo de Transporte</Text>
          <TouchableOpacity
            style={styles.comboboxButton}
            onPress={() => setIsVehicleModalOpen(true)}
            activeOpacity={0.7}
            testID="vehicle-type-combobox"
          >
            <Text style={styles.comboboxValueText}>{selectedVehicleLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Placa do Veículo</Text>
            <TextInput
              style={styles.textInput}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="Ex: ABC-1D23"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              testID="vehicle-plate-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Registro CNH</Text>
            <TextInput
              style={styles.textInput}
              value={cnh}
              onChangeText={setCnh}
              placeholder="Número de registro da CNH"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              testID="cnh-input"
            />
          </View>
        </View>

        {/* Section 3: Dados Pessoais */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="id-card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Nome Completo</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={COLORS.textMuted}
              testID="courier-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Telefone / WhatsApp</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="(42) 99999-9999"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              testID="courier-phone-input"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsBox}>
          <Button
            title={isSaving ? 'Salvando...' : 'Salvar Alterações'}
            onPress={handleSaveProfile}
            loading={isSaving}
            disabled={isSaving}
            testID="save-profile-btn"
          />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            testID="logout-btn"
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Encerrar Sessão</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Combo-box de Raio do Radar */}
      <Modal
        visible={isRadiusModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRadiusModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRadiusModalOpen(false)}
        >
          <View style={[styles.modalContent, SHADOWS.md]}>
            <Text style={styles.modalHeaderTitle}>Selecione o Raio do Radar</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = Math.abs(radiusKm - opt) < 0.1;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setRadiusKm(opt);
                      setIsRadiusModalOpen(false);
                    }}
                    testID={`radius-option-${opt}`}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextSelected,
                      ]}
                    >
                      {opt} km
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Combo-box de Tipo de Transporte */}
      <Modal
        visible={isVehicleModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVehicleModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVehicleModalOpen(false)}
        >
          <View style={[styles.modalContent, SHADOWS.md]}>
            <Text style={styles.modalHeaderTitle}>Selecione o Tipo de Transporte</Text>
            <View>
              {VEHICLE_OPTIONS.map((opt) => {
                const isSelected = vehicleType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setVehicleType(opt.value);
                      setIsVehicleModalOpen(false);
                    }}
                    testID={`vehicle-option-${opt.value}`}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoBox: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  comboboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    marginTop: 4,
  },
  comboboxValueText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 4,
    marginTop: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 42,
    fontSize: 13,
    color: COLORS.text,
  },
  actionButtonsBox: {
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  modalItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  modalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
