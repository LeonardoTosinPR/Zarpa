import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { RoleSelector } from '../src/components/RoleSelector';
import { AlertBanner } from '../src/components/AlertBanner';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { VehicleType } from '../src/types/auth';

const VEHICLES = [
  { type: 'motorcycle' as const, label: 'Moto', iconName: 'bicycle-outline' as const },
  { type: 'bicycle' as const, label: 'Bicicleta', iconName: 'walk-outline' as const },
  { type: 'car' as const, label: 'Carro', iconName: 'car-outline' as const },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [role, setRole] = useState<'client' | 'courier'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Client specific fields
  const [businessName, setBusinessName] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');

  // Courier specific fields
  const [cnh, setCnh] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [clusterRadius, setClusterRadius] = useState('5.0');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegister() {
    setErrorMessage(null);

    // Basic Validation
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (role === 'client') {
      if (!businessName.trim() || !cnpjCpf.trim()) {
        setErrorMessage('Preencha a Razão Social e CNPJ/CPF do seu comércio.');
        return;
      }
    } else {
      if (!cnh.trim()) {
        setErrorMessage('Informe o número da sua CNH.');
        return;
      }
    }

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
      };

      if (role === 'client') {
        payload.business_name = businessName.trim();
        payload.cnpj_cpf = cnpjCpf.trim();
        payload.default_address = defaultAddress.trim() || undefined;
      } else {
        payload.cnh = cnh.trim();
        payload.vehicle_type = vehicleType;
        payload.vehicle_plate = vehiclePlate.trim() || undefined;
        payload.cluster_radius_km = parseFloat(clusterRadius) || 5.0;
      }

      const user = await register(payload);

      if (user.role === 'client' || user.role === 'admin') {
        router.replace('/(client)/dashboard');
      } else {
        router.replace('/(courier)/dashboard');
      }
    } catch (error: any) {
      const serverMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join('\n')
          : 'Erro ao criar conta. Verifique os dados preenchidos.');
      setErrorMessage(serverMsg);
    }
  }

  return (
    <ScreenContainer scrollable withKeyboardAvoid contentContainerStyle={styles.scrollContent}>
      {/* Header Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        testID="register-back-button"
      >
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={styles.backIcon} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Crie sua conta</Text>
        <Text style={styles.subtitle}>
          Junte-se à rede Zarpa para envio e entrega inteligente em Guarapuava.
        </Text>
      </View>

      {/* Role Selector */}
      <RoleSelector selectedRole={role} onSelect={setRole} />

      {/* Error Banner */}
      {errorMessage && (
        <AlertBanner
          message={errorMessage}
          type="error"
          testID="register-error-banner"
        />
      )}

      {/* Common Account Fields */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>1. Informações de Acesso</Text>
      </View>

      <Input
        label="Nome Completo *"
        placeholder="Seu nome ou responsável"
        iconName="person-outline"
        value={name}
        onChangeText={setName}
        testID="register-name-input"
      />

      <Input
        label="E-mail de Acesso *"
        placeholder="seuemail@zarpa.com.br"
        keyboardType="email-address"
        autoCapitalize="none"
        iconName="mail-outline"
        value={email}
        onChangeText={setEmail}
        testID="register-email-input"
      />

      <Input
        label="Senha de Acesso (mínimo 6 dígitos) *"
        placeholder="Crie uma senha segura"
        isPassword
        iconName="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        testID="register-password-input"
      />

      <Input
        label="Telefone / WhatsApp"
        placeholder="(42) 99999-0000"
        keyboardType="phone-pad"
        iconName="call-outline"
        value={phone}
        onChangeText={setPhone}
        testID="register-phone-input"
      />

      {/* Conditional Actor Fields */}
      {role === 'client' ? (
        <View style={styles.actorSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Dados do Comércio (Lojista)</Text>
          </View>

          <Input
            label="Nome Fantasia / Razão Social *"
            placeholder="ex: Padaria Central Guarapuava"
            iconName="business-outline"
            value={businessName}
            onChangeText={setBusinessName}
            testID="register-business-name-input"
          />

          <Input
            label="CNPJ ou CPF *"
            placeholder="00.000.000/0001-00"
            keyboardType="numeric"
            iconName="card-outline"
            value={cnpjCpf}
            onChangeText={setCnpjCpf}
            testID="register-cnpj-input"
          />

          <Input
            label="Endereço Padrão de Coleta (Opcional)"
            placeholder="Rua Saldanha Marinho, 1200 - Centro"
            iconName="location-outline"
            value={defaultAddress}
            onChangeText={setDefaultAddress}
            testID="register-address-input"
          />
        </View>
      ) : (
        <View style={styles.actorSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Dados de Condutor (Entregador)</Text>
          </View>

          <Input
            label="Número da CNH *"
            placeholder="Número da Carteira Nacional de Habilitação"
            keyboardType="numeric"
            iconName="id-card-outline"
            value={cnh}
            onChangeText={setCnh}
            testID="register-cnh-input"
          />

          {/* Vehicle Type Selector */}
          <Text style={styles.fieldLabel}>Tipo de Veículo *</Text>
          <View style={styles.vehicleRow}>
            {VEHICLES.map((v) => {
              const isSelected = vehicleType === v.type;
              return (
                <TouchableOpacity
                  key={v.type}
                  style={[
                    styles.vehiclePill,
                    isSelected && styles.vehiclePillSelected,
                  ]}
                  onPress={() => setVehicleType(v.type)}
                  activeOpacity={0.7}
                  testID={`vehicle-option-${v.type}`}
                >
                  <Ionicons
                    name={v.iconName}
                    size={20}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.vehicleLabel,
                      isSelected && styles.vehicleLabelSelected,
                    ]}
                  >
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Placa do Veículo (se aplicável)"
            placeholder="ex: BRA2E19"
            autoCapitalize="characters"
            iconName="speedometer-outline"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            testID="register-plate-input"
          />

          <Input
            label="Raio Máximo de Deslocamento (km)"
            placeholder="ex: 5.0"
            keyboardType="numeric"
            iconName="locate-outline"
            value={clusterRadius}
            onChangeText={setClusterRadius}
            testID="register-radius-input"
          />
        </View>
      )}

      {/* Submit Button */}
      <Button
        title={`Criar Conta como ${role === 'client' ? 'Lojista' : 'Entregador'}`}
        arrow
        onPress={handleRegister}
        loading={isLoading}
        size="lg"
        style={styles.submitButton}
        testID="register-submit-button"
      />

      {/* Footer Login Link */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Já possui uma conta Zarpa? </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          testID="register-to-login-button"
          activeOpacity={0.7}
        >
          <Text style={styles.loginLink}>Entrar agora</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  backIcon: {
    marginRight: 4,
  },
  backText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  sectionHeader: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
  actorSection: {
    marginTop: SPACING.xs,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  vehiclePillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  vehicleLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
  },
  vehicleLabelSelected: {
    color: COLORS.primary,
  },
  submitButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
});
