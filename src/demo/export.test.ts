import { describe, expect, it } from 'vitest';
import { buildStandaloneSvg } from './export';

const markup =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" class="nihonmap"><g></g></svg>';

describe('buildStandaloneSvg', () => {
  it('xmlnsとviewBoxを保ったまま配色のstyleを差し込む', () => {
    const out = buildStandaloneSvg(markup, 'light', '#ffffff');
    expect(out.startsWith('<svg')).toBe(true);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('<style>');
  });

  it('テーマで選択色が変わる', () => {
    expect(buildStandaloneSvg(markup, 'light', '#fff')).toContain('#1f4f7a');
    expect(buildStandaloneSvg(markup, 'dark', '#14181c')).toContain('#7fb0dd');
  });

  it('背景の矩形を本体の先頭に敷く', () => {
    const out = buildStandaloneSvg(markup, 'light', '#abcdef');
    expect(out).toContain('<rect width="100%" height="100%" fill="#abcdef"/>');
    // styleと背景はルートのsvg開始タグ直後に入る
    expect(out.indexOf('<style>')).toBeLessThan(out.indexOf('<g>'));
  });
});
