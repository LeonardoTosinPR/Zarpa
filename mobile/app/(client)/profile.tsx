import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';

export default function ClientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const businessName = user?.client?.business_name || user?.name || 'Comércio Parceiro';
  const cnpj = user?.client?.cnpj_cpf || 'Não informado';
  const email = user?.email || 'email@exemplo.com';
  const phone = user?.phone || 'Não informado';
  const defaultAddress = user?.client?.default_address || 'Centro, Guarapuava - PR';

  async function handleLogout() {
    Alert.alert('Confirmar Saída', 'Deseja realmente encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, SHADOWS.sm]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>🏪</Text>
          </View>
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.userRole}>Lojista Cadastrado (Zarpa)</Text>
          <View style={styles.emailPill}>
            <Text style={styles.emailText}>{email}</Text>
          </View>
        </View>

        {/* Business Details */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dados do Estabelecimento</Text>
        </View>

        <View style={[styles.infoCard, SHADOWS.sm]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CNPJ / CPF</Text>
            <Text style={styles.infoValue}>{cnpj}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefone / WhatsApp</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endereço Padrão de Coleta</Text>
            <Text style={styles.infoValue}>{defaultAddress}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cidade / Polo</Text>
            <Text style={styles.infoValue}>Guarapuava - PR</Text>
          </View>
        </View>

        {/* Operational Guidelines */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modalidades de Entrega</Text>
        </View>

        <View style={[styles.infoCard, SHADOWS.sm]}>
          <View style={styles.modalityInfoItem}>
            <Text style={styles.modalityIcon}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalityInfoTitle}>Modalidade Econômica</Text>
              <Text style={styles.modalityInfoDesc}>
                Coleta no lote diário compartilhado com economia cooperativa 50/50 calculada
                pelo algoritmo de agrupamento noturno.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.modalityInfoItem}>
            <Text style={styles.modalityIcon}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalityInfoTitle}>Modalidade Expressa</Text>
              <Text style={styles.modalityInfoDesc}>
                Envio imediato sob demanda com roteamento prioritário e tarifa individual integral.
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sair da Conta"
            variant="outline"
            onPress={handleLogout}
            testID="logout-button"
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
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 32,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  userRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emailPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  emailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  infoRow: {
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  modalityInfoItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  modalityIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  modalityInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalityInfoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  logoutContainer: {
    marginTop: SPACING.xs,
  },
});
