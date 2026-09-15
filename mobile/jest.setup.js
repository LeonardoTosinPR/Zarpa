import React from 'react';

// Increase default test timeout for Windows environments
jest.setTimeout(15000);

// Mock @expo/vector-icons with Text to be safe inside or outside Text nodes
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  const createMockIcon = (family) => {
    const IconComponent = (props) => (
      <Text testID={props.testID || `icon-${family}-${props.name || 'unnamed'}`} {...props}>
        {props.name || family}
      </Text>
    );
    IconComponent.displayName = family;
    return IconComponent;
  };

  return {
    Ionicons: createMockIcon('Ionicons'),
    Feather: createMockIcon('Feather'),
    MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons'),
    FontAwesome: createMockIcon('FontAwesome'),
    FontAwesome5: createMockIcon('FontAwesome5'),
    FontAwesome6: createMockIcon('FontAwesome6'),
    Octicons: createMockIcon('Octicons'),
    createIconSet: () => createMockIcon('CustomIcon'),
  };
});

// Mock expo-font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));
