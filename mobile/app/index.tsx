import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { ScreenContainer } from '../src/components/ScreenContainer';

export default function WelcomeScreen() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading, quickLogin } = useAuth();

  // Automatic routing if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'client' || role === 'admin') {
        router.replace('/(client)/dashboard');
      } else if (role === 'courier') {
        router.replace('/(courier)/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, role]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando sessão Zarpa...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.scrollContent}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoBadge}>
          <Ionicons name="flash" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.brandTitle}>Zarpa</Text>
        <Text style={styles.brandSubtitle}>
          Intermediação Inteligente de Entregas Urbanas
        </Text>
        <Text style={styles.brandTagline}>
          Otimização colaborativa de rotas com distribuição dinâmica de frete em Guarapuava.
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresContainer}>
        <View style={[styles.featureCard, SHADOWS.sm]}>
          <View style={styles.featureIconBox}>
            <Ionicons name="storefront-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Para Comércios & Lojistas</Text>
            <Text style={styles.featureDesc}>
              Envio expresso sob demanda e lote econômico com rateio colaborativo.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, SHADOWS.sm]}>
          <View style={[styles.featureIconBox, styles.featureIconBoxAccent]}>
            <Ionicons name="bicycle-outline" size={24} color={COLORS.accentDark} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Para Entregadores & Condutores</Text>
            <Text style={styles.featureDesc}>
              Radar de entregas imediatas e lotes organizados com bônus de produtividade.
            </Text>
          </View>
        </View>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          title="Acessar Minha Conta"
          arrow
          onPress={() => router.push('/login')}
          size="lg"
          testID="welcome-login-button"
        />

        <Button
          title="Cadastrar Novo Perfil"
          variant="outline"
          onPress={() => router.push('/register')}
          size="lg"
          testID="welcome-register-button"
        />
      </View>

      {/* Quick Demo Credentials for Fast Testing */}
      <View style={[styles.demoSection, SHADOWS.sm]}>
        <View style={styles.demoHeader}>
          <Ionicons name="speedometer-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.demoTitle}>Acesso Rápido para Demonstração (Sprint 1)</Text>
        </View>
        <View style={styles.demoButtonsRow}>
          <TouchableOpacity
            style={[styles.demoPill, styles.demoAdmin]}
            onPress={() => quickLogin('admin')}
            testID="quick-login-admin"
            activeOpacity={0.75}
          >
            <Ionicons name="shield-checkmark" size={13} color={COLORS.purpleDark} />
            <Text style={[styles.demoPillText, styles.demoAdminText]}>Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoPill, styles.demoClient]}
            onPress={() => quickLogin('client')}
            testID="quick-login-client"
            activeOpacity={0.75}
          >
            <Ionicons name="storefront" size={13} color={COLORS.primary} />
            <Text style={[styles.demoPillText, styles.demoClientText]}>Lojista</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoPill, styles.demoCourier]}
            onPress={() => quickLogin('courier')}
            testID="quick-login-courier"
            activeOpacity={0.75}
          >
            <Ionicons name="bicycle" size={13} color={COLORS.accentDark} />
            <Text style={[styles.demoPillText, styles.demoCourierText]}>Entregador</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  scrollContent: {
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  brandTitle: {
    fontSize: TYPOGRAPHY.size.hero,
    fontWeight: TYPOGRAPHY.weight.black,
    color: COLORS.primary,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
    maxWidth: 320,
  },
  featuresContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureIconBoxAccent: {
    backgroundColor: COLORS.accentLight,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  actionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  demoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  demoTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  demoAdmin: {
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purpleBorder,
  },
  demoAdminText: {
    color: COLORS.purpleDark,
  },
  demoClient: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  demoClientText: {
    color: COLORS.primary,
  },
  demoCourier: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accentBorder,
  },
  demoCourierText: {
    color: COLORS.accentDark,
  },
  demoPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
});
