// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JapanMap, prefectureByCode } from './map';
import type { PrefectureFeature } from './types';

function groupOf(host: HTMLElement, code: number): Element {
  const el = host.querySelector(`[data-code="${code}"]`);
  if (el === null) throw new Error(`code=${code} が見つからない`);
  return el;
}

describe('JapanMap', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
  });

  it('コンストラクタで47都道府県が描画される', () => {
    new JapanMap(host);
    expect(host.querySelectorAll('.nihonmap-pref')).toHaveLength(47);
  });

  it('クリックで選択し、もう一度で解除する', () => {
    const seen: (PrefectureFeature | null)[] = [];
    const map = new JapanMap(host, { onSelect: (p) => seen.push(p) });
    const tokyo = groupOf(host, 13);
    tokyo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(map.selected).toBe(13);
    expect(tokyo.classList.contains('is-selected')).toBe(true);
    expect(tokyo.getAttribute('aria-pressed')).toBe('true');
    tokyo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(map.selected).toBeNull();
    expect(seen.map((p) => p?.code ?? null)).toEqual([13, null]);
  });

  it('選択の切り替えで前の選択が外れる', () => {
    const map = new JapanMap(host);
    groupOf(host, 13).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    groupOf(host, 27).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(map.selected).toBe(27);
    expect(groupOf(host, 13).classList.contains('is-selected')).toBe(false);
    expect(host.querySelectorAll('.is-selected')).toHaveLength(1);
  });

  it('Enterキーでも選択できる', () => {
    const map = new JapanMap(host);
    groupOf(host, 1).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(map.selected).toBe(1);
  });

  it('ホバーでonHoverが県と離脱時nullで呼ばれる', () => {
    const onHover = vi.fn();
    new JapanMap(host, { onHover });
    groupOf(host, 26).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ code: 26 }));
    host.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('updateでモードを切り替えても選択が残る', () => {
    const map = new JapanMap(host);
    map.select(40);
    map.update({ mode: 'grid' });
    expect(host.querySelectorAll('.nihonmap-cell')).toHaveLength(47);
    expect(groupOf(host, 40).classList.contains('is-selected')).toBe(true);
  });

  it('destroyで空になりイベントも外れる', () => {
    const onSelect = vi.fn();
    const map = new JapanMap(host, { onSelect });
    map.destroy();
    expect(host.innerHTML).toBe('');
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('prefectureByCode', () => {
  it('コードから引ける', () => {
    expect(prefectureByCode(34)?.name).toBe('広島県');
    expect(prefectureByCode(99)).toBeUndefined();
  });
});
