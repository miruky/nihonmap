import { describe, expect, it } from 'vitest';
import { prefectureFeatures } from '../lib';
import { area2020 } from './area';

describe('area2020', () => {
  it('47都道府県すべてに正の面積がある', () => {
    expect(Object.keys(area2020)).toHaveLength(47);
    for (const p of prefectureFeatures) {
      expect(area2020[p.code]).toBeGreaterThan(0);
    }
  });

  it('北海道が最大、香川が最小', () => {
    const entries = Object.entries(area2020).map(([k, v]) => [Number(k), v] as const);
    const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const min = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(max[0]).toBe(1); // 北海道
    expect(min[0]).toBe(37); // 香川県
  });

  it('合計が日本の国土面積に近い', () => {
    const total = Object.values(area2020).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(370000);
    expect(total).toBeLessThan(385000);
  });
});
