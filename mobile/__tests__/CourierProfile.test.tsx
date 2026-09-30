import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CourierProfileScreen from '../app/(courier)/profile';
import { courierService } from '../src/services/courierService';
import { AuthProvider } from '../src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Courier Profile Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and renders courier profile data including combo-boxes and avatar', async () => {
    jest.spyOn(courierService, 'getProfile').mockResolvedValue({
      message: 'Perfil acessado',
      courier: {
        id: 1,
        cluster_radius_km: 5.0,
        vehicle_type: 'motorcycle',
        vehicle_plate: 'ABC-1234',
        cnh: '12345678900',
        is_online: true,
      },
      user: {
        id: 1,
        name: 'Roberto Entregador',
        email: 'roberto@zarpa.com.br',
        phone: '4299887766',
        role: 'courier',
      },
    });

    const { findByText, findByTestId } = render(
      <AuthProvider>
        <CourierProfileScreen />
      </AuthProvider>
    );

    expect(await findByText('Roberto Entregador')).toBeTruthy();
    expect(await findByText('roberto@zarpa.com.br')).toBeTruthy();
    expect(await findByTestId('courier-radius-combobox')).toBeTruthy();
    expect(await findByTestId('vehicle-type-combobox')).toBeTruthy();
    expect(await findByTestId('profile-avatar-picker-btn')).toBeTruthy();
    expect(await findByTestId('save-profile-btn')).toBeTruthy();
  });

  it('updates operating radius and vehicle type using combo-box modals and submits updated profile', async () => {
    jest.spyOn(courierService, 'getProfile').mockResolvedValue({
      message: 'Perfil acessado',
      courier: {
        id: 1,
        cluster_radius_km: 5.0,
        vehicle_type: 'motorcycle',
        vehicle_plate: 'ABC-1234',
        cnh: '12345678900',
        is_online: true,
      },
      user: {
        id: 1,
        name: 'Roberto Entregador',
        email: 'roberto@zarpa.com.br',
        phone: '4299887766',
        role: 'courier',
      },
    });

    const updateSpy = jest.spyOn(courierService, 'updateProfile').mockResolvedValue({
      message: 'Perfil atualizado',
      courier: {},
      user: {},
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByTestId } = render(
      <AuthProvider>
        <CourierProfileScreen />
      </AuthProvider>
    );

    // Abre modal de combo-box de raio e seleciona 10 km
    const radiusCombobox = await findByTestId('courier-radius-combobox');
    fireEvent.press(radiusCombobox);

    const radiusOpt10 = await findByTestId('radius-option-10');
    fireEvent.press(radiusOpt10);

    // Abre modal de combo-box de veículo e seleciona Bicicleta
    const vehicleCombobox = await findByTestId('vehicle-type-combobox');
    fireEvent.press(vehicleCombobox);

    const bikeOpt = await findByTestId('vehicle-option-bicycle');
    fireEvent.press(bikeOpt);

    // Clica em Salvar Alterações
    const saveBtn = await findByTestId('save-profile-btn');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cluster_radius_km: 10,
          vehicle_type: 'bicycle',
        })
      );
      expect(alertSpy).toHaveBeenCalledWith('Sucesso', expect.stringContaining('atualizados com sucesso'));
    });
  });

  it('allows picking a new profile avatar image from the device library', async () => {
    jest.spyOn(courierService, 'getProfile').mockResolvedValue({
      message: 'Perfil acessado',
      courier: {
        id: 1,
        cluster_radius_km: 5.0,
        vehicle_type: 'motorcycle',
        is_online: true,
      },
      user: {
        id: 1,
        name: 'Roberto',
        email: 'roberto@zarpa.com.br',
        role: 'courier',
      },
    });

    const permissionSpy = jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValue({
      granted: true,
      status: 'granted' as any,
      canAskAgain: true,
      expires: 'never',
    });

    const imagePickerSpy = jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///path/to/new_avatar.jpg',
          width: 200,
          height: 200,
        } as any,
      ],
    });

    const { findByTestId } = render(
      <AuthProvider>
        <CourierProfileScreen />
      </AuthProvider>
    );

    const avatarBtn = await findByTestId('profile-avatar-picker-btn');
    fireEvent.press(avatarBtn);

    await waitFor(() => {
      expect(permissionSpy).toHaveBeenCalled();
      expect(imagePickerSpy).toHaveBeenCalled();
    });
  });

  it('validates empty name before sending update request', async () => {
    jest.spyOn(courierService, 'getProfile').mockResolvedValue({
      message: 'Perfil acessado',
      courier: {
        id: 1,
        cluster_radius_km: 5.0,
        vehicle_type: 'motorcycle',
        is_online: true,
      },
      user: {
        id: 1,
        name: 'Roberto',
        email: 'roberto@zarpa.com.br',
        role: 'courier',
      },
    });

    const updateSpy = jest.spyOn(courierService, 'updateProfile');
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByTestId } = render(
      <AuthProvider>
        <CourierProfileScreen />
      </AuthProvider>
    );

    const nameInput = await findByTestId('courier-name-input');
    fireEvent.changeText(nameInput, '');

    const saveBtn = await findByTestId('save-profile-btn');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Atenção',
        'Informe seu nome completo.'
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
