import { describe, expect, it } from 'vitest';
import { renderJapanMap } from './render';

describe('renderJapanMap (shape)', () => {
  const svg = renderJapanMap();

  it('viewBox付きのSVGで47都道府県を含む', () => {
    expect(svg).toMatch(/^<svg [^>]*viewBox="/);
    expect(svg.match(/class="nihonmap-pref/g)).toHaveLength(47);
    expect(svg.match(/<path class="nihonmap-shape"/g)).toHaveLength(47);
  });

  it('各都道府県にtitleとaria-labelが付く', () => {
    expect(svg).toContain('<title>東京都</title>');
    expect(svg).toContain('aria-label="北海道"');
    expect(svg.match(/<title>/g)).toHaveLength(47);
  });

  it('既定でフォーカス可能なボタンになる', () => {
    expect(svg.match(/role="button"/g)).toHaveLength(47);
    expect(svg.match(/tabindex="0"/g)).toHaveLength(47);
  });

  it('interactive: false でボタン属性が消える', () => {
    const plain = renderJapanMap({ interactive: false });
    expect(plain).not.toContain('role="button"');
    expect(plain).not.toContain('tabindex');
  });

  it('fillコールバックがインラインstyleで反映される', () => {
    const filled = renderJapanMap({ fill: (p) => (p.code === 1 ? '#ff0000' : null) });
    expect(filled).toContain('style="fill:#ff0000"');
    expect(filled.match(/style="fill:/g)).toHaveLength(1);
  });

  it('selectedにis-selectedとaria-pressedが付く', () => {
    const sel = renderJapanMap({ selected: 13 });
    expect(sel).toContain('class="nihonmap-pref is-selected" data-code="13"');
    expect(sel.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(sel.match(/aria-pressed="false"/g)).toHaveLength(46);
  });

  it('スタッガ用に--iが順に振られる', () => {
    expect(svg).toContain('style="--i:0"');
    expect(svg).toContain('style="--i:46"');
  });
});

describe('renderJapanMap (okinawaInset)', () => {
  it('沖縄にtransformが付き、区切り線が入る', () => {
    const svg = renderJapanMap({ okinawaInset: true });
    expect(svg).toMatch(/data-code="47"[^>]*transform="translate\(/);
    expect(svg).toContain('nihonmap-inset-line');
  });

  it('insetで地図の枠が狭まる', () => {
    const h = (s: string) => Number(/viewBox="[-\d.]+ [-\d.]+ [\d.]+ ([\d.]+)"/.exec(s)?.[1]);
    expect(h(renderJapanMap({ okinawaInset: true }))).toBeLessThan(h(renderJapanMap()));
  });
});

describe('renderJapanMap (grid)', () => {
  const svg = renderJapanMap({ mode: 'grid' });

  it('47セルと略称ラベルを描く', () => {
    expect(svg.match(/<rect class="nihonmap-cell"/g)).toHaveLength(47);
    expect(svg.match(/<text class="nihonmap-label"/g)).toHaveLength(47);
    expect(svg).toContain('>東京</text>');
    expect(svg).toContain('>北海道</text>');
  });

  it('labels: false でラベルが消える', () => {
    expect(renderJapanMap({ mode: 'grid', labels: false })).not.toContain('nihonmap-label');
  });

  it('aria-labelは正式名称のまま', () => {
    expect(svg).toContain('aria-label="東京都"');
  });
});
