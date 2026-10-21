import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

export interface DeliveryProofPayload {
  method: 'code' | 'photo';
  deliveryCode?: string;
  proofUrl?: string;
  photoBase64?: string;
}

export interface DeliveryProofModalProps {
  visible: boolean;
  orderId?: number | null;
  title?: string;
  submitLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: DeliveryProofPayload) => void;
}

export function DeliveryProofModal({
  visible,
  orderId,
  title = 'Confirmar Entrega',
  submitLabel = 'Confirmar e Finalizar',
  loading = false,
  onClose,
  onSubmit,
}: DeliveryProofModalProps) {
  const [proofMethod, setProofMethod] = useState<'code' | 'photo'>('code');
  const [deliveryCode, setDeliveryCode] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setProofMethod('code');
      setDeliveryCode('');
      setProofUrl('');
      setPhotoBase64(null);
    }
  }, [visible]);

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Autorize o acesso à câmera para fotografar o comprovante.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofUrl(asset.uri);
        if (asset.base64) {
          setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch {
      Alert.alert(
        'Câmera Indisponível',
        'Não foi possível abrir a câmera neste dispositivo.'
      );
    }
  };

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Autorize o acesso à galeria para anexar a foto do comprovante.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofUrl(asset.uri);
        if (asset.base64) {
          setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch {
      Alert.alert(
        'Galeria Indisponível',
        'Não foi possível abrir a galeria neste dispositivo.'
      );
    }
  };

  const handleConfirm = () => {
    if (proofMethod === 'code') {
      const cleanCode = deliveryCode.trim();
      if (!/^\d{6}$/.test(cleanCode)) {
        Alert.alert(
          'Código Obrigatório',
          'Digite o código numérico de 6 dígitos fornecido pelo lojista/destinatário para validar a entrega.'
        );
        return;
      }
      onSubmit({
        method: 'code',
        deliveryCode: cleanCode,
      });
    } else {
      const cleanUrl = proofUrl.trim();
      if (!cleanUrl && !photoBase64) {
        Alert.alert(
          'Comprovante Obrigatório',
          'Tire uma foto do comprovante de entrega ou informe o código de 6 dígitos do pedido.'
        );
        return;
      }
      onSubmit({
        method: 'photo',
        proofUrl: cleanUrl || undefined,
        photoBase64: photoBase64 || undefined,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, SHADOWS.lg]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="shield-checkmark" size={22} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDesc}>
            Finalize o Pedido #{orderId} enviando o código de 6 dígitos do pedido ou uma foto de comprovante.
          </Text>

          {/* Seletor de Método de Validação */}
          <View style={styles.methodTabsRow}>
            <TouchableOpacity
              style={[
                styles.methodTabBtn,
                proofMethod === 'code' && styles.methodTabBtnActive,
              ]}
              onPress={() => setProofMethod('code')}
              activeOpacity={0.8}
              testID="proof-tab-code"
            >
              <Ionicons
                name="keypad-outline"
                size={15}
                color={proofMethod === 'code' ? '#FFFFFF' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.methodTabText,
                  proofMethod === 'code' && styles.methodTabTextActive,
                ]}
              >
                Código (6 dígitos)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodTabBtn,
                proofMethod === 'photo' && styles.methodTabBtnActive,
              ]}
              onPress={() => setProofMethod('photo')}
              activeOpacity={0.8}
              testID="proof-tab-photo"
            >
              <Ionicons
                name="camera-outline"
                size={16}
                color={proofMethod === 'photo' ? '#FFFFFF' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.methodTabText,
                  proofMethod === 'photo' && styles.methodTabTextActive,
                ]}
              >
                Foto de Comprovante
              </Text>
            </TouchableOpacity>
          </View>

          {proofMethod === 'code' ? (
            <View style={styles.proofSection}>
              <Text style={styles.proofLabel}>Código de Confirmação (6 dígitos):</Text>
              <TextInput
                style={styles.codeDigitInput}
                value={deliveryCode}
                onChangeText={(txt) => setDeliveryCode(txt.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                testID="delivery-code-input"
              />
              <View style={styles.proofInfoRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color="#059669"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.proofInfoText}>
                  Solicite o código de 6 dígitos gerado no pedido ao destinatário ou lojista.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.proofSection}>
              <Text style={styles.proofLabel}>Comprovante de Entrega (Foto / Link):</Text>
              <View style={styles.cameraActionsRow}>
                <TouchableOpacity
                  style={styles.cameraActionBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                  testID="take-photo-btn"
                >
                  <Ionicons name="camera" size={16} color={COLORS.primary} />
                  <Text style={styles.cameraActionBtnText}>Usar Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraActionBtn}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                  testID="pick-photo-btn"
                >
                  <Ionicons name="images-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.cameraActionBtnText}>Da Galeria</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.proofInput}
                value={proofUrl}
                onChangeText={setProofUrl}
                placeholder="Insira URL ou tire uma foto do recibo"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                testID="proof-input"
              />
              <View style={styles.proofInfoRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color="#059669"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.proofInfoText}>
                  A imagem do comprovante será exibida no extrato e rastreamento do lojista.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, loading && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
              testID="submit-delivery-proof-btn"
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.modalSubmitBtnText}>
                {loading ? 'Validando...' : submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalIconWrap: {
    marginRight: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  methodTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  methodTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodTabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  methodTabTextActive: {
    color: '#FFFFFF',
  },
  proofSection: {
    marginBottom: 16,
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  codeDigitInput: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    color: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  cameraActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cameraActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  proofInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  proofInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  proofInfoText: {
    fontSize: 11,
    color: '#059669',
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

