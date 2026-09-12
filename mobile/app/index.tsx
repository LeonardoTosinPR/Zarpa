import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, quickLogin } = useAuth();

  // Automatic routing if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'client') {
        router.replace('/(client)/dashboard');
      } else if (role === 'courier') {
        router.replace('/(courier)/dashboard');
      } else if (role === 'admin') {
        router.replace('/(client)/dashboard');
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
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
            <Text style={styles.featureIcon}>🏪</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Para Comércios & Lojistas</Text>
              <Text style={styles.featureDesc}>
                Envio expresso sob demanda e lote econômico com rateio colaborativo.
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, SHADOWS.sm]}>
            <Text style={styles.featureIcon}>🛵</Text>
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
            style={styles.registerButton}
            testID="welcome-register-button"
          />
        </View>

        {/* Quick Demo Credentials for Fast Testing */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ Acesso Rápido para Demonstração (Sprint 1)</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={[styles.demoPill, styles.demoAdmin]}
              onPress={() => quickLogin('admin')}
              testID="quick-login-admin"
            >
              <Text style={styles.demoPillText}>👑 Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoPill, styles.demoClient]}
              onPress={() => quickLogin('client')}
              testID="quick-login-client"
            >
              <Text style={styles.demoPillText}>🏪 Lojista</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoPill, styles.demoCourier]}
              onPress={() => quickLogin('courier')}
              testID="quick-login-courier"
            >
              <Text style={styles.demoPillText}>🛵 Entregador</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.xxl,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
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
  logoIcon: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  brandTagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
    maxWidth: 300,
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
  featureIcon: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  registerButton: {
    marginTop: 0,
  },
  demoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  demoPill: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  demoAdmin: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  demoClient: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  demoCourier: {
    backgroundColor: COLORS.accentLight,
    borderColor: '#A7F3D0',
  },
  demoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
});
