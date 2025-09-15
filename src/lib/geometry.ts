// 地図座標の組み立て。投影・SVGパス化・外接枠の計算と、
// 任意のGeoJSON(市区町村境界など)を同じ座標系へ重ねるための変換。

import { projectionParams } from './data/prefectures';
import type { Bounds } from './types';

export type LonLat = readonly [number, number];

/** 経緯度を都道府県データと同じ平面座標へ投影する */
export function lonLatToXY([lon, lat]: LonLat): [number, number] {
  const { cosLat, minX, minY, scale } = projectionParams;
  return [(lon * cosLat - minX) * scale, (-lat - minY) * scale];
}

/** 平坦な座標配列([x0,y0,x1,y1,...])の輪郭群をSVGパスにする */
export function ringsToPath(rings: readonly (readonly number[])[]): string {
  let d = '';
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      d += `${i === 0 ? 'M' : 'L'}${ring[i]} ${ring[i + 1]}`;
    }
    d += 'Z';
  }
  return d;
}

/** 輪郭群の外接枠 */
export function ringsBounds(ringsList: readonly (readonly (readonly number[])[])[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rings of ringsList) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const x = ring[i] ?? 0;
        const y = ring[i + 1] ?? 0;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export type GeoJsonInput = GeoJsonGeometry | GeoJsonFeature | GeoJsonFeatureCollection;

function lineToPath(line: LonLat[], close: boolean): string {
  let d = '';
  line.forEach(([lon, lat], i) => {
    const [x, y] = lonLatToXY([lon, lat]);
    d += `${i === 0 ? 'M' : 'L'}${round2(x)} ${round2(y)}`;
  });
  return close ? `${d}Z` : d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function geometryToPath(geometry: GeoJsonGeometry): string {
  switch (geometry.type) {
    case 'Polygon':
      return (geometry.coordinates as LonLat[][]).map((ring) => lineToPath(ring, true)).join('');
    case 'MultiPolygon':
      return (geometry.coordinates as LonLat[][][])
        .map((polygon) => polygon.map((ring) => lineToPath(ring, true)).join(''))
        .join('');
    case 'LineString':
      return lineToPath(geometry.coordinates as LonLat[], false);
    case 'MultiLineString':
      return (geometry.coordinates as LonLat[][]).map((line) => lineToPath(line, false)).join('');
    case 'Point': {
      const [x, y] = lonLatToXY(geometry.coordinates as LonLat);
      // 点は小さな円弧で表す(パス1本のAPIに収めるため)
      return `M${round2(x)} ${round2(y)}m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`;
    }
    default:
      throw new Error(`未対応のGeoJSONジオメトリ: ${geometry.type}`);
  }
}

/**
 * GeoJSONを都道府県データと同じ座標系のSVGパスへ変換する。
 * 市区町村境界など、手持ちの境界データを地図へ重ねる用途を想定している。
 */
export function geoJsonToPath(input: GeoJsonInput): string {
  if (input.type === 'FeatureCollection') {
    return (input as GeoJsonFeatureCollection).features
      .filter((f) => f.geometry !== null)
      .map((f) => geometryToPath(f.geometry as GeoJsonGeometry))
      .join('');
  }
  if (input.type === 'Feature') {
    const geometry = (input as GeoJsonFeature).geometry;
    if (geometry === null) return '';
    return geometryToPath(geometry);
  }
  return geometryToPath(input as GeoJsonGeometry);
}
