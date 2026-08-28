import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ Zarpa</Text>
        <Text style={styles.tagline}>
          Intermediação Inteligente de Entregas Urbanas
        </Text>
        <Text style={styles.subtagline}>
          Guarapuava - PR
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Modalidade Expressa</Text>
          <Text style={styles.cardDesc}>
            Atendimento prioritário imediato sob demanda com radar por proximidade.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Lote Econômico 50/50</Text>
          <Text style={styles.cardDesc}>
            Agrupamento noturno inteligente com rateio de economia e bônus compartilhado.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.statusText}>✅ Sprint 0: Ambiente & Monorepo Inicializado</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 64,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#38BDF8',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  subtagline: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
  },
  statusText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
  },
});

