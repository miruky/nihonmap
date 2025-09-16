import { describe, expect, it } from 'vitest';
import { geoJsonToPath, lonLatToXY, ringsBounds, ringsToPath } from './geometry';
import { prefectureFeatures } from './data/prefectures';

describe('lonLatToXY', () => {
  it('東京都庁の経緯度が東京都の外接枠に入る', () => {
    const [x, y] = lonLatToXY([139.6917, 35.6895]);
    const tokyo = prefectureFeatures.find((p) => p.code === 13);
    const b = ringsBounds([tokyo?.rings ?? []]);
    expect(x).toBeGreaterThanOrEqual(b.minX);
    expect(x).toBeLessThanOrEqual(b.maxX);
    expect(y).toBeGreaterThanOrEqual(b.minY);
    expect(y).toBeLessThanOrEqual(b.maxY);
  });

  it('北ほどyが小さく、東ほどxが大きい', () => {
    const sapporo = lonLatToXY([141.35, 43.06]);
    const naha = lonLatToXY([127.68, 26.21]);
    expect(sapporo[1]).toBeLessThan(naha[1]);
    expect(sapporo[0]).toBeGreaterThan(naha[0]);
  });
});

describe('ringsToPath', () => {
  it('M/L/Zの閉じたパスを作る', () => {
    expect(ringsToPath([[0, 0, 10, 0, 10, 10]])).toBe('M0 0L10 0L10 10Z');
    expect(
      ringsToPath([
        [0, 0, 1, 1],
        [2, 2, 3, 3],
      ]),
    ).toBe('M0 0L1 1ZM2 2L3 3Z');
  });
});

describe('ringsBounds', () => {
  it('複数輪郭の外接枠を返す', () => {
    expect(ringsBounds([[[0, 5, 10, 15]], [[-3, 8, 4, 2]]])).toEqual({
      minX: -3,
      minY: 2,
      maxX: 10,
      maxY: 15,
    });
  });
});

describe('geoJsonToPath', () => {
  const square = {
    type: 'Polygon',
    coordinates: [
      [
        [139.0, 35.0],
        [140.0, 35.0],
        [140.0, 36.0],
        [139.0, 36.0],
        [139.0, 35.0],
      ],
    ],
  };

  it('Polygonを閉じたパスにする', () => {
    const d = geoJsonToPath(square);
    expect(d).toMatch(/^M[\d.]+ [\d.]+L/);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('Polygonの角がlonLatToXYと一致する', () => {
    const d = geoJsonToPath(square);
    const [x, y] = lonLatToXY([139.0, 35.0]);
    expect(d.startsWith(`M${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`)).toBe(true);
  });

  it('FeatureCollectionとMultiPolygonを連結する', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: square },
        { type: 'Feature', geometry: null },
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [square.coordinates, square.coordinates],
          },
        },
      ],
    } as const;
    const d = geoJsonToPath(fc as never);
    expect(d.match(/M/g)).toHaveLength(3);
    expect(d.match(/Z/g)).toHaveLength(3);
  });

  it('LineStringは閉じない', () => {
    const d = geoJsonToPath({
      type: 'LineString',
      coordinates: [
        [139.0, 35.0],
        [140.0, 36.0],
      ],
    } as never);
    expect(d.endsWith('Z')).toBe(false);
  });

  it('未対応ジオメトリは拒否する', () => {
    expect(() => geoJsonToPath({ type: 'GeometryCollection', coordinates: [] } as never)).toThrow(
      /未対応/,
    );
  });
});
