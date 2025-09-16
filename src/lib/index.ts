// nihonmap: 依存ゼロの都道府県SVG日本地図ライブラリ。

export { prefectureFeatures, projectionParams } from './data/prefectures';
export { gridPositions } from './data/grid';
export { lonLatToXY, ringsToPath, ringsBounds, geoJsonToPath } from './geometry';
export type { GeoJsonInput, LonLat } from './geometry';
export { mixHex, linearColorScale, quantizeColorScale } from './color';
export { renderJapanMap } from './render';
export { JapanMap, prefectureByCode } from './map';
export type { JapanMapOptions } from './map';
export type { Bounds, MapMode, PrefectureFeature, ProjectionParams, RenderOptions } from './types';
