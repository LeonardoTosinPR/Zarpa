import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateOrderScreen from '../app/(client)/create-order';
import { AuthProvider } from '../src/context/AuthContext';
import { orderService } from '../src/services/orderService';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMapView = (props: any) => <View testID="mock-map-view" {...props}>{props.children}</View>;
  const MockMarker = (props: any) => <View testID="mock-marker" {...props} />;
  const MockPolyline = (props: any) => <View testID="mock-polyline" {...props} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_DEFAULT: 'default',
  };
});

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Create Order Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order form inputs and modality options', () => {
    const { getByText, getByTestId } = render(
      <AuthProvider>
        <CreateOrderScreen />
      </AuthProvider>
    );

    expect(getByText('Novo Pedido de Entrega')).toBeTruthy();
    expect(getByTestId('destination-search-input')).toBeTruthy();
    expect(getByTestId('package-description-input')).toBeTruthy();
    expect(getByTestId('package-weight-input')).toBeTruthy();
    expect(getByTestId('modality-economic-button')).toBeTruthy();
    expect(getByTestId('modality-express-button')).toBeTruthy();
    expect(getByTestId('submit-order-button')).toBeTruthy();
  });

  it('allows toggling between Economic and Express shipping modalities', () => {
    const { getByTestId, getByText } = render(
      <AuthProvider>
        <CreateOrderScreen />
      </AuthProvider>
    );

    const expressBtn = getByTestId('modality-express-button');
    const economicBtn = getByTestId('modality-economic-button');

    fireEvent.press(expressBtn);
    expect(getByText('Sob Demanda')).toBeTruthy();

    fireEvent.press(economicBtn);
    expect(getByText('-20% Rateio')).toBeTruthy();
  });
});
