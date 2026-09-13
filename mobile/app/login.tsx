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
import { COLORS, RADIUS, SHADOWS, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, quickLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    try {
      const user = await login({ email: email.trim(), password });
      
      if (user.role === 'client' || user.role === 'admin') {
        router.replace('/(client)/dashboard');
      } else if (user.role === 'courier') {
        router.replace('/(courier)/dashboard');
      }
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || 'Falha ao autenticar. Verifique suas credenciais.';
      setErrorMessage(serverMsg);
    }
  }

  async function handleQuickLogin(targetRole: 'admin' | 'client' | 'courier') {
    setErrorMessage(null);
    try {
      const user = await quickLogin(targetRole);
      if (user.role === 'client' || user.role === 'admin') {
        router.replace('/(client)/dashboard');
      } else if (user.role === 'courier') {
        router.replace('/(courier)/dashboard');
      }
    } catch (error: any) {
      setErrorMessage('Não foi possível realizar o login automático de teste.');
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
            testID="login-back-button"
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          {/* Title Header */}
          <View style={styles.header}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIcon}>⚡</Text>
            </View>
            <Text style={styles.title}>Acesse sua conta</Text>
            <Text style={styles.subtitle}>
              Entre com suas credenciais para gerenciar suas entregas e rotas no Zarpa.
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner} testID="login-error-banner">
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Inputs */}
          <View style={styles.form}>
            <Input
              label="E-mail"
              placeholder="ex: seuemail@zarpa.com.br"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="✉️"
              value={email}
              onChangeText={setEmail}
              testID="login-email-input"
            />

            <Input
              label="Senha"
              placeholder="Digite sua senha"
              isPassword
              icon="🔒"
              value={password}
              onChangeText={setPassword}
              testID="login-password-input"
            />

            <Button
              title="Entrar"
              arrow
              onPress={handleLogin}
              loading={isLoading}
              size="lg"
              style={styles.submitButton}
              testID="login-submit-button"
            />
          </View>

          {/* Test Users Quick Logins */}
          <View style={[styles.demoContainer, SHADOWS.sm]}>
            <Text style={styles.demoTitle}>💡 Preenchimento Rápido para Teste (Sprint 1)</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.demoBtn, styles.demoAdminBtn]}
                onPress={() => handleQuickLogin('admin')}
                testID="login-quick-admin"
              >
                <Text style={styles.demoBtnText}>👑 Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoBtn, styles.demoClientBtn]}
                onPress={() => handleQuickLogin('client')}
                testID="login-quick-client"
              >
                <Text style={styles.demoBtnText}>🏪 Lojista</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoBtn, styles.demoCourierBtn]}
                onPress={() => handleQuickLogin('courier')}
                testID="login-quick-courier"
              >
                <Text style={styles.demoBtnText}>🛵 Entregador</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/register')} testID="login-to-register-button">
              <Text style={styles.registerLink}>Cadastre-se aqui</Text>
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
    marginBottom: SPACING.xxl,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  brandIcon: {
    fontSize: 24,
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
  form: {
    marginBottom: SPACING.xl,
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
  demoContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  demoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  demoBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  demoAdminBtn: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  demoClientBtn: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  demoCourierBtn: {
    backgroundColor: COLORS.accentLight,
    borderColor: '#A7F3D0',
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
