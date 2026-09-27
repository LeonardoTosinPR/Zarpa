// Mock vector icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(View, { testID: props.testID || 'mock-ionicon', ...props }),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => React.createElement(View, { testID: props.testID || 'mock-ionicon', ...props });
});

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -25.3954,
        longitude: -51.4641,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
    })
  ),
  reverseGeocodeAsync: jest.fn(() =>
    Promise.resolve([
      {
        street: 'Rua das Flores',
        streetNumber: '100',
        district: 'Centro',
        city: 'Guarapuava',
        region: 'Paraná',
        country: 'Brasil',
        postalCode: '85010-000',
        name: 'Rua das Flores, 100',
      },
    ])
  ),
  Accuracy: {
    Balanced: 3,
    High: 4,
  },
}));
