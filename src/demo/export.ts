// 表示中の地図を単体のSVGファイルとして書き出す。ページのCSSから切り離されても
// 配色が保たれるよう、現在のテーマの色を<style>として埋め込み、背景の矩形を敷く。
// 塗り分け中の県はインラインstyleのfillを持つので、<style>より優先されて残る。

import type { ResolvedTheme } from '../theme';

interface ExportPalette {
  shapeFill: string;
  stroke: string;
  selected: string;
  label: string;
  inset: string;
}

const PALETTES: Record<ResolvedTheme, ExportPalette> = {
  light: {
    shapeFill: '#dfe5ea',
    stroke: '#b3bcc4',
    selected: '#1f4f7a',
    label: '#1f262c',
    inset: '#9aa6b0',
  },
  dark: {
    shapeFill: '#2a333c',
    stroke: '#46515b',
    selected: '#7fb0dd',
    label: '#e7e4dc',
    inset: '#6e7882',
  },
};

/** SVGマークアップに配色の<style>と背景を与え、単体で完結するSVG文字列にする */
export function buildStandaloneSvg(markup: string, theme: ResolvedTheme, bg: string): string {
  const p = PALETTES[theme];
  const style =
    '<style>' +
    `.nihonmap-shape,.nihonmap-cell{fill:${p.shapeFill};stroke:${p.stroke};stroke-width:1;stroke-linejoin:round}` +
    `.nihonmap-pref.is-selected .nihonmap-shape,.nihonmap-pref.is-selected .nihonmap-cell{stroke:${p.selected};stroke-width:2.4}` +
    `.nihonmap-label{fill:${p.label}}` +
    `.nihonmap-inset-line{stroke:${p.inset}}` +
    '</style>';
  const background = `<rect width="100%" height="100%" fill="${bg}"/>`;
  return markup.replace(/(<svg[^>]*>)/, `$1${style}${background}`);
}
