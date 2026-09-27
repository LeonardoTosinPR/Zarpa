import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateOrderScreen from '../app/(client)/create-order';
import { AuthProvider } from '../src/context/AuthContext';
import { orderService } from '../src/services/orderService';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props: any, ref: any) => (
    <View testID="mock-map-view" ref={ref} {...props}>
      {props.children}
    </View>
  ));
  const MockMarker = (props: any) => <View testID="mock-marker" {...props} />;
  const MockPolyline = (props: any) => <View testID="mock-polyline" {...props} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_DEFAULT: 'default',
    PROVIDER_GOOGLE: 'google',
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
    expect(getByTestId('mock-map-view')).toBeTruthy();
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

  it('starts with empty pickup point and allows choosing store address or current location', async () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <AuthProvider>
        <CreateOrderScreen />
      </AuthProvider>
    );

    // Initial state: Pickup point selection options are shown, clear button is not present
    expect(getByText('Selecione ou digite o local de partida da entrega:')).toBeTruthy();
    expect(getByTestId('origin-current-location-button')).toBeTruthy();
    expect(getByTestId('origin-store-address-button')).toBeTruthy();
    expect(getByTestId('origin-search-input')).toBeTruthy();
    expect(queryByTestId('clear-origin-button')).toBeNull();

    // Select Store address
    fireEvent.press(getByTestId('origin-store-address-button'));
    expect(getByText('Endereço da Loja')).toBeTruthy();
    expect(getByTestId('clear-origin-button')).toBeTruthy();

    // Clear origin
    fireEvent.press(getByTestId('clear-origin-button'));
    expect(getByText('Selecione ou digite o local de partida da entrega:')).toBeTruthy();

    // Select Current Location (GPS)
    fireEvent.press(getByTestId('origin-current-location-button'));
    await waitFor(() => {
      expect(getByText('Localização Atual (GPS)')).toBeTruthy();
    });
    expect(getByTestId('clear-origin-button')).toBeTruthy();
  });

  it('allows manually typing and selecting a pickup address via autocomplete', async () => {
    const mockGeocodeResults = [
      {
        display_name: 'Rua Saldanha Marinho, 500, Batel, Guarapuava - PR',
        street: 'Rua Saldanha Marinho, 500',
        neighborhood: 'Batel',
        city: 'Guarapuava',
        state: 'PR',
        lat: -25.399,
        lng: -51.472,
        source: 'nominatim',
      },
    ];

    jest.spyOn(orderService, 'geocode').mockResolvedValue(mockGeocodeResults);

    const { getByTestId, findByTestId, getByText } = render(
      <AuthProvider>
        <CreateOrderScreen />
      </AuthProvider>
    );

    const originInput = getByTestId('origin-search-input');
    fireEvent.changeText(originInput, 'Saldanha');

    const suggestionItem = await findByTestId('origin-suggestion-item-0');
    expect(suggestionItem).toBeTruthy();

    fireEvent.press(suggestionItem);

    expect(getByText('Endereço Informado')).toBeTruthy();
    expect(getByText('Rua Saldanha Marinho, 500, Batel, Guarapuava - PR')).toBeTruthy();
    expect(getByTestId('clear-origin-button')).toBeTruthy();
  });
});
