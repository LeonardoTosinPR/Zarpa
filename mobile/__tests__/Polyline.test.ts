import { decodePolyline } from '../src/utils/polyline';

describe('Polyline Decoder Utility', () => {
  it('returns empty array when encoded string is empty, null or undefined', () => {
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline(null)).toEqual([]);
    expect(decodePolyline(undefined)).toEqual([]);
  });

  it('correctly decodes standard OSRM polyline into coordinate points', () => {
    // Polyline de exemplo simples
    const samplePolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const points = decodePolyline(samplePolyline);

    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toHaveProperty('latitude');
    expect(points[0]).toHaveProperty('longitude');
    expect(typeof points[0].latitude).toBe('number');
    expect(typeof points[0].longitude).toBe('number');
  });
});
