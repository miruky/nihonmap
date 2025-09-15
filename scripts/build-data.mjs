#!/usr/bin/env node
// Natural Earth admin-1 GeoJSONから都道府県の描画データを生成する。
//
//   curl -L -o /tmp/ne_10m_admin1.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//   node scripts/build-data.mjs /tmp/ne_10m_admin1.geojson
//
// 出力は src/lib/data/prefectures.ts。座標は幅1000の平面に投影した整数値。
// 沖ノ鳥島・南鳥島は地図の枠を不必要に広げるため落とす(READMEに明記)。

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = process.argv[2];
if (SOURCE === undefined) {
  console.error('使い方: node scripts/build-data.mjs <ne_10m_admin_1_states_provinces.geojson>');
  process.exit(2);
}

const WIDTH = 1000; // 出力座標系の幅
const MIN_AREA_KM2 = 15; // これ未満の島は落とす
const TOLERANCE_KM = 0.8; // Douglas-Peuckerの許容誤差

const KANA = [
  'ほっかいどう',
  'あおもり',
  'いわて',
  'みやぎ',
  'あきた',
  'やまがた',
  'ふくしま',
  'いばらき',
  'とちぎ',
  'ぐんま',
  'さいたま',
  'ちば',
  'とうきょう',
  'かながわ',
  'にいがた',
  'とやま',
  'いしかわ',
  'ふくい',
  'やまなし',
  'ながの',
  'ぎふ',
  'しずおか',
  'あいち',
  'みえ',
  'しが',
  'きょうと',
  'おおさか',
  'ひょうご',
  'なら',
  'わかやま',
  'とっとり',
  'しまね',
  'おかやま',
  'ひろしま',
  'やまぐち',
  'とくしま',
  'かがわ',
  'えひめ',
  'こうち',
  'ふくおか',
  'さが',
  'ながさき',
  'くまもと',
  'おおいた',
  'みやざき',
  'かごしま',
  'おきなわ',
];

const REGIONS = [
  [1, 1, '北海道'],
  [2, 7, '東北'],
  [8, 14, '関東'],
  [15, 23, '中部'],
  [24, 30, '近畿'],
  [31, 35, '中国'],
  [36, 39, '四国'],
  [40, 47, '九州・沖縄'],
];

function regionOf(code) {
  const hit = REGIONS.find(([from, to]) => code >= from && code <= to);
  return hit[2];
}

// 緯度36度基準の正距円筒図法。日本の縦横比が自然に見える経験的な定番
const COS_LAT = Math.cos((36 * Math.PI) / 180);
const KM_PER_DEG = 111.32;

function project([lon, lat]) {
  return [lon * COS_LAT, -lat];
}

function ringAreaKm2(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = project(ring[i]);
    const [x2, y2] = project(ring[(i + 1) % ring.length]);
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2) * KM_PER_DEG * KM_PER_DEG;
}

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  const left = douglasPeucker(points.slice(0, index + 1), tolerance);
  const right = douglasPeucker(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

function centroidLonLat(ring) {
  let lon = 0;
  let lat = 0;
  for (const p of ring) {
    lon += p[0];
    lat += p[1];
  }
  return [lon / ring.length, lat / ring.length];
}

const geojson = JSON.parse(readFileSync(SOURCE, 'utf8'));
const features = geojson.features.filter((f) => f.properties.iso_a2 === 'JP');
if (features.length !== 47) {
  console.error(`都道府県が47件ではありません: ${features.length}件`);
  process.exit(1);
}

const tolDeg = TOLERANCE_KM / KM_PER_DEG;
const prefs = features
  .map((f) => {
    const code = Number(f.properties.iso_3166_2.slice(3));
    const polygons =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = [];
    for (const polygon of polygons) {
      const outer = polygon[0];
      const [lon, lat] = centroidLonLat(outer);
      if (lat < 24 || lon > 146) continue; // 沖ノ鳥島・南鳥島
      if (ringAreaKm2(outer) < MIN_AREA_KM2) continue;
      const simplified = douglasPeucker(outer, tolDeg);
      if (simplified.length >= 4) rings.push(simplified.map(project));
    }
    if (rings.length === 0) {
      console.error(`${f.properties.name_ja} の輪郭が残りません`);
      process.exit(1);
    }
    const name = f.properties.name_ja;
    return {
      code,
      name,
      short: name === '北海道' ? name : name.slice(0, -1),
      kana: KANA[code - 1],
      en: f.properties.name.normalize('NFD').replace(/[̀-ͯ]/g, ''),
      region: regionOf(code),
      rings,
    };
  })
  .sort((a, b) => a.code - b.code);

// 全体の外接枠を幅WIDTHへ正規化して整数化する
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
for (const pref of prefs) {
  for (const ring of pref.rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
    }
  }
}
const scale = WIDTH / (maxX - minX);

let totalPoints = 0;
for (const pref of prefs) {
  pref.flat = pref.rings.map((ring) => {
    const out = [];
    let px = NaN;
    let py = NaN;
    for (const [x, y] of ring) {
      const qx = Math.round((x - minX) * scale);
      const qy = Math.round((y - minY) * scale);
      if (qx === px && qy === py) continue;
      out.push(qx, qy);
      px = qx;
      py = qy;
    }
    return out;
  });
  pref.flat = pref.flat.filter((ring) => ring.length >= 8);
  totalPoints += pref.flat.reduce((n, r) => n + r.length / 2, 0);
}

const lines = [];
lines.push('// このファイルは scripts/build-data.mjs が生成する。手で編集しない。');
lines.push('// 出典: Natural Earth 1:10m admin-1 states and provinces(パブリックドメイン)');
lines.push("import type { PrefectureFeature, ProjectionParams } from '../types';");
lines.push('');
lines.push('// 経緯度を同じ座標系へ投影するためのパラメータ(geometry.tsが使う)');
lines.push('export const projectionParams: ProjectionParams = {');
lines.push(`  cosLat: ${COS_LAT},`);
lines.push(`  minX: ${minX},`);
lines.push(`  minY: ${minY},`);
lines.push(`  scale: ${scale},`);
lines.push('};');
lines.push('');
lines.push('export const prefectureFeatures: readonly PrefectureFeature[] = [');
for (const pref of prefs) {
  lines.push('  {');
  lines.push(`    code: ${pref.code},`);
  lines.push(`    name: '${pref.name}',`);
  lines.push(`    short: '${pref.short}',`);
  lines.push(`    kana: '${pref.kana}',`);
  lines.push(`    en: '${pref.en}',`);
  lines.push(`    region: '${pref.region}',`);
  lines.push(`    rings: [`);
  for (const ring of pref.flat) {
    lines.push(`      [${ring.join(', ')}],`);
  }
  lines.push('    ],');
  lines.push('  },');
}
lines.push('];');
lines.push('');

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/data/prefectures.ts');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(
  `${prefs.length}都道府県 / 輪郭${prefs.reduce((n, p) => n + p.flat.length, 0)}本 / ${totalPoints}点 -> ${outPath}`,
);
