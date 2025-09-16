import { describe, expect, it } from 'vitest';
import { linearColorScale, mixHex, quantizeColorScale } from './color';

describe('mixHex', () => {
  it('端点と中点を返す', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('tを0〜1に丸める', () => {
    expect(mixHex('#102030', '#aabbcc', -1)).toBe('#102030');
    expect(mixHex('#102030', '#aabbcc', 2)).toBe('#aabbcc');
  });

  it('不正な色を拒否する', () => {
    expect(() => mixHex('red', '#ffffff', 0)).toThrow(/16進カラー/);
    expect(() => mixHex('#fff', '#ffffff', 0)).toThrow(/16進カラー/);
  });
});

describe('linearColorScale', () => {
  const scale = linearColorScale([0, 100], ['#000000', '#ffffff']);

  it('値域を色へ線形に写す', () => {
    expect(scale(0)).toBe('#000000');
    expect(scale(50)).toBe('#808080');
    expect(scale(100)).toBe('#ffffff');
  });

  it('値域外は端へ丸める', () => {
    expect(scale(-10)).toBe('#000000');
    expect(scale(110)).toBe('#ffffff');
  });

  it('幅ゼロの値域は終端色', () => {
    expect(linearColorScale([5, 5], ['#000000', '#ffffff'])(5)).toBe('#ffffff');
  });
});

describe('quantizeColorScale', () => {
  const colors = ['#111111', '#222222', '#333333'];
  const scale = quantizeColorScale([0, 30], colors);

  it('値域をn等分して色を選ぶ', () => {
    expect(scale(0)).toBe('#111111');
    expect(scale(15)).toBe('#222222');
    expect(scale(29)).toBe('#333333');
    expect(scale(30)).toBe('#333333');
  });

  it('値域外は端の色', () => {
    expect(scale(-5)).toBe('#111111');
    expect(scale(99)).toBe('#333333');
  });

  it('空の色配列を拒否する', () => {
    expect(() => quantizeColorScale([0, 1], [])).toThrow(/1つ以上/);
  });
});
