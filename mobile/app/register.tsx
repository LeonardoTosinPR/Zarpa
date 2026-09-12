import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { RoleSelector } from '../src/components/RoleSelector';
import { VehicleType } from '../src/types/auth';

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="register-back-button"
          >
            <Text style={styles.backText}>← Voltar</Text>
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
            <View style={styles.errorBanner} testID="register-error-banner">
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Common Account Fields */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Informações de Acesso</Text>
          </View>

          <Input
            label="Nome Completo *"
            placeholder="Seu nome ou responsável"
            icon="👤"
            value={name}
            onChangeText={setName}
            testID="register-name-input"
          />

          <Input
            label="E-mail de Acesso *"
            placeholder="seuemail@zarpa.com.br"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="✉️"
            value={email}
            onChangeText={setEmail}
            testID="register-email-input"
          />

          <Input
            label="Senha de Acesso (mínimo 6 dígitos) *"
            placeholder="Crie uma senha segura"
            isPassword
            icon="🔒"
            value={password}
            onChangeText={setPassword}
            testID="register-password-input"
          />

          <Input
            label="Telefone / WhatsApp"
            placeholder="(42) 99999-0000"
            keyboardType="phone-pad"
            icon="📱"
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
                icon="🏪"
                value={businessName}
                onChangeText={setBusinessName}
                testID="register-business-name-input"
              />

              <Input
                label="CNPJ ou CPF *"
                placeholder="00.000.000/0001-00"
                keyboardType="numeric"
                icon="📄"
                value={cnpjCpf}
                onChangeText={setCnpjCpf}
                testID="register-cnpj-input"
              />

              <Input
                label="Endereço Padrão de Coleta (Opcional)"
                placeholder="Rua Saldanha Marinho, 1200 - Centro"
                icon="📍"
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
                icon="🪪"
                value={cnh}
                onChangeText={setCnh}
                testID="register-cnh-input"
              />

              {/* Vehicle Type Selector */}
              <Text style={styles.fieldLabel}>Tipo de Veículo *</Text>
              <View style={styles.vehicleRow}>
                {(
                  [
                    { type: 'motorcycle', label: 'Moto', icon: '🛵' },
                    { type: 'bicycle', label: 'Bicicleta', icon: '🚲' },
                    { type: 'car', label: 'Carro', icon: '🚗' },
                  ] as const
                ).map((v) => (
                  <TouchableOpacity
                    key={v.type}
                    style={[
                      styles.vehiclePill,
                      vehicleType === v.type && styles.vehiclePillSelected,
                    ]}
                    onPress={() => setVehicleType(v.type)}
                    activeOpacity={0.7}
                    testID={`vehicle-option-${v.type}`}
                  >
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                    <Text
                      style={[
                        styles.vehicleLabel,
                        vehicleType === v.type && styles.vehicleLabelSelected,
                      ]}
                    >
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Placa do Veículo (se aplicável)"
                placeholder="ex: BRA2E19"
                autoCapitalize="characters"
                icon="🔢"
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                testID="register-plate-input"
              />

              <Input
                label="Raio Máximo de Deslocamento (km)"
                placeholder="ex: 5.0"
                keyboardType="numeric"
                icon="🎯"
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
            <TouchableOpacity onPress={() => router.push('/login')} testID="register-to-login-button">
              <Text style={styles.loginLink}>Entrar agora</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xxl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actorSection: {
    marginTop: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  vehicleIcon: {
    fontSize: 18,
  },
  vehicleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  vehicleLabelSelected: {
    color: COLORS.primary,
  },
  submitButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
