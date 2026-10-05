import React from 'react';
import { render } from '@testing-library/react-native';
import MyMap, {
  GUARAPUAVA_DEFAULT_COORDS,
  DEFAULT_MAP_PIN_ICON,
} from '../src/components/MyMap';

describe('MyMap Component (Professor Andres - pdm-ts-maps-leaflet)', () => {
  it('renders MyMap successfully with default Guarapuava configuration', () => {
    const { getByTestId } = render(<MyMap />);
    const mapContainer = getByTestId('mock-map-view');
    expect(mapContainer).toBeTruthy();
  });

  it('renders MyMap with custom markers and shapes', () => {
    const customMarkers = [
      {
        id: 'courier-1',
        position: { lat: -25.3954, lng: -51.4641 },
        icon: DEFAULT_MAP_PIN_ICON,
        size: [32, 32] as [number, number],
      },
    ];

    const customShapes = [
      {
        shapeType: 'circle' as const,
        id: 'radar-500m',
        center: { lat: -25.3954, lng: -51.4641 },
        radius: 500,
        pathOptions: { color: 'blue' },
      },
    ];

    const { getByTestId } = render(
      <MyMap
        mapCenterPosition={{ lat: -25.3954, lng: -51.4641 }}
        zoom={15}
        mapMarkers={customMarkers}
        mapShapes={customShapes}
      />
    );

    expect(getByTestId('mock-map-view')).toBeTruthy();
  });
});
