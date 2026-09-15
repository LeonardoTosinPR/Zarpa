import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { AlertBanner } from '../src/components/AlertBanner';
import { ScreenContainer } from '../src/components/ScreenContainer';

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
    <ScreenContainer scrollable withKeyboardAvoid contentContainerStyle={styles.scrollContent}>
      {/* Header Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        testID="login-back-button"
      >
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={styles.backIcon} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Ionicons name="flash" size={24} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Acesse sua conta</Text>
        <Text style={styles.subtitle}>
          Entre com suas credenciais para gerenciar suas entregas e rotas no Zarpa.
        </Text>
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <AlertBanner
          message={errorMessage}
          type="error"
          testID="login-error-banner"
        />
      )}

      {/* Form Inputs */}
      <View style={styles.form}>
        <Input
          label="E-mail"
          placeholder="ex: seuemail@zarpa.com.br"
          keyboardType="email-address"
          autoCapitalize="none"
          iconName="mail-outline"
          value={email}
          onChangeText={setEmail}
          testID="login-email-input"
        />

        <Input
          label="Senha"
          placeholder="Digite sua senha"
          isPassword
          iconName="lock-closed-outline"
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
        <View style={styles.demoTitleRow}>
          <Ionicons name="flash-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.demoTitle}>Preenchimento Rápido para Teste (Sprint 1)</Text>
        </View>
        <View style={styles.demoRow}>
          <TouchableOpacity
            style={[styles.demoBtn, styles.demoAdminBtn]}
            onPress={() => handleQuickLogin('admin')}
            testID="login-quick-admin"
            activeOpacity={0.75}
          >
            <Ionicons name="shield-checkmark" size={14} color={COLORS.purpleDark} />
            <Text style={[styles.demoBtnText, styles.demoAdminText]}>Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoBtn, styles.demoClientBtn]}
            onPress={() => handleQuickLogin('client')}
            testID="login-quick-client"
            activeOpacity={0.75}
          >
            <Ionicons name="storefront" size={14} color={COLORS.primary} />
            <Text style={[styles.demoBtnText, styles.demoClientText]}>Lojista</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoBtn, styles.demoCourierBtn]}
            onPress={() => handleQuickLogin('courier')}
            testID="login-quick-courier"
            activeOpacity={0.75}
          >
            <Ionicons name="bicycle" size={14} color={COLORS.accentDark} />
            <Text style={[styles.demoBtnText, styles.demoCourierText]}>Entregador</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Register Link */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem uma conta? </Text>
        <TouchableOpacity
          onPress={() => router.push('/register')}
          testID="login-to-register-button"
          activeOpacity={0.7}
        >
          <Text style={styles.registerLink}>Cadastre-se aqui</Text>
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
    marginBottom: SPACING.xl,
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
  form: {
    marginBottom: SPACING.lg,
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
  demoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.md,
  },
  demoTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textSecondary,
  },
  demoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  demoAdminBtn: {
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purpleBorder,
  },
  demoAdminText: {
    color: COLORS.purpleDark,
  },
  demoClientBtn: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  demoClientText: {
    color: COLORS.primary,
  },
  demoCourierBtn: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accentBorder,
  },
  demoCourierText: {
    color: COLORS.accentDark,
  },
  demoBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
  },
});
