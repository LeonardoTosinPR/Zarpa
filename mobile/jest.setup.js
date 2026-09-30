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

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props, ref) => (
    <View testID="mock-map-view" ref={ref} {...props}>
      {props.children}
    </View>
  ));
  const MockMarker = (props) => <View testID="mock-marker" {...props} />;
  const MockPolyline = (props) => <View testID="mock-polyline" {...props} />;
  const MockCircle = (props) => <View testID="mock-circle" {...props} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    Circle: MockCircle,
    PROVIDER_DEFAULT: 'default',
    PROVIDER_GOOGLE: 'google',
  };
});

