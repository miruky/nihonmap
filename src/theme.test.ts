import { describe, expect, it } from 'vitest';
import { normalizeTheme, resolveTheme, nextTheme, themeLabel } from './theme';

describe('normalizeTheme', () => {
  it('妥当な値はそのまま返す', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBe('system');
  });

  it('未知の値や欠落はsystemに倒す', () => {
    expect(normalizeTheme(null)).toBe('system');
    expect(normalizeTheme('')).toBe('system');
    expect(normalizeTheme('blue')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('明示指定はOS設定に関わらずそのまま', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('systemはOSの設定に従う', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('system→light→dark→systemと巡回する', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('themeLabel', () => {
  it('日本語ラベルを返す', () => {
    expect(themeLabel('system')).toBe('システム');
    expect(themeLabel('light')).toBe('ライト');
    expect(themeLabel('dark')).toBe('ダーク');
  });
});
