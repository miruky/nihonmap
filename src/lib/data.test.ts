import { describe, expect, it } from 'vitest';
import { prefectureFeatures, projectionParams } from './data/prefectures';
import { gridPositions } from './data/grid';

describe('prefectureFeatures', () => {
  it('47都道府県がコード順に並ぶ', () => {
    expect(prefectureFeatures).toHaveLength(47);
    expect(prefectureFeatures.map((p) => p.code)).toEqual(
      Array.from({ length: 47 }, (_, i) => i + 1),
    );
  });

  it('代表的な名称・読み・地方が正しい', () => {
    const byCode = new Map(prefectureFeatures.map((p) => [p.code, p]));
    expect(byCode.get(1)).toMatchObject({ name: '北海道', short: '北海道', region: '北海道' });
    expect(byCode.get(13)).toMatchObject({ name: '東京都', short: '東京', kana: 'とうきょう' });
    expect(byCode.get(26)).toMatchObject({ name: '京都府', short: '京都', region: '近畿' });
    expect(byCode.get(47)).toMatchObject({ name: '沖縄県', region: '九州・沖縄', en: 'Okinawa' });
  });

  it('八地方区分の内訳が正しい', () => {
    const count = new Map<string, number>();
    for (const p of prefectureFeatures) count.set(p.region, (count.get(p.region) ?? 0) + 1);
    expect(Object.fromEntries(count)).toEqual({
      北海道: 1,
      東北: 6,
      関東: 7,
      中部: 9,
      近畿: 7,
      中国: 5,
      四国: 4,
      '九州・沖縄': 8,
    });
  });

  it('読みはすべてひらがな', () => {
    for (const p of prefectureFeatures) expect(p.kana).toMatch(/^[ぁ-ん]+$/);
  });

  it('輪郭は偶数長で点数4以上、座標は幅1000の枠に収まる', () => {
    for (const p of prefectureFeatures) {
      expect(p.rings.length).toBeGreaterThan(0);
      for (const ring of p.rings) {
        expect(ring.length % 2).toBe(0);
        expect(ring.length).toBeGreaterThanOrEqual(8);
        for (let i = 0; i < ring.length; i += 2) {
          expect(ring[i]).toBeGreaterThanOrEqual(0);
          expect(ring[i]).toBeLessThanOrEqual(1000);
          expect(ring[i + 1]).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('投影パラメータが妥当な値を持つ', () => {
    expect(projectionParams.cosLat).toBeCloseTo(Math.cos((36 * Math.PI) / 180), 10);
    expect(projectionParams.scale).toBeGreaterThan(0);
  });
});

describe('gridPositions', () => {
  it('47件あり、セルが重複しない', () => {
    expect(gridPositions).toHaveLength(47);
    const cells = new Set(gridPositions.map(([c, r]) => `${c},${r}`));
    expect(cells.size).toBe(47);
  });

  it('北海道が最北東、沖縄が最南西にある', () => {
    const hokkaido = gridPositions[0] ?? [0, 0];
    const okinawa = gridPositions[46] ?? [0, 0];
    expect(hokkaido[1]).toBe(0);
    expect(okinawa[0]).toBe(0);
    expect(okinawa[1]).toBe(Math.max(...gridPositions.map(([, r]) => r)));
  });

  it('隣接する県のセルが近い(東京と神奈川、大阪と京都)', () => {
    const tokyo = gridPositions[12] ?? [0, 0];
    const kanagawa = gridPositions[13] ?? [0, 0];
    const osaka = gridPositions[26] ?? [0, 0];
    const kyoto = gridPositions[25] ?? [0, 0];
    const near = (a: readonly [number, number], b: readonly [number, number]) =>
      Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
    expect(near(tokyo, kanagawa)).toBe(true);
    expect(near(osaka, kyoto)).toBe(true);
  });
});
