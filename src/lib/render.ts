// SVG文字列の組み立て。DOMに依存しない純関数で、テストとSSRの両方で使える。

import { prefectureFeatures } from './data/prefectures';
import { gridPositions } from './data/grid';
import { ringsToPath, ringsBounds } from './geometry';
import type { Bounds, PrefectureFeature, RenderOptions } from './types';

const PAD = 10;
const CELL = 64;
const GAP = 8;
const PITCH = CELL + GAP;
const OKINAWA = 47;

// 既定の見た目はプレゼンテーション属性で与える。CSSのどんな規則よりも
// 優先度が低いので、利用側は .nihonmap-shape { fill: ... } だけで上書きできる
const SHAPE_ATTRS = 'fill="#d6dde4" stroke="#7b8893" stroke-width="1" stroke-linejoin="round"';
const LABEL_ATTRS = 'fill="currentColor" font-size="15" text-anchor="middle" pointer-events="none"';
const INSET_LINE_ATTRS = 'fill="none" stroke="#7b8893" stroke-dasharray="5 5"';

function escapeXml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

function prefAttrs(
  pref: PrefectureFeature,
  index: number,
  selected: number | null,
  interactive: boolean,
): string {
  const attrs = [
    `class="nihonmap-pref${pref.code === selected ? ' is-selected' : ''}"`,
    `data-code="${pref.code}"`,
    `data-region="${escapeXml(pref.region)}"`,
    `style="--i:${index}"`,
    `aria-label="${escapeXml(pref.name)}"`,
  ];
  if (interactive) {
    attrs.push('role="button"', 'tabindex="0"', `aria-pressed="${pref.code === selected}"`);
  }
  return attrs.join(' ');
}

function fillStyle(fill: RenderOptions['fill'], pref: PrefectureFeature): string {
  const color = fill?.(pref);
  return typeof color === 'string' ? ` style="fill:${escapeXml(color)}"` : '';
}

interface Inset {
  transform: string;
  line: string;
}

/** 沖縄を本土の外接枠の左上へ移す変換と、区切り線のパス */
function okinawaInset(mainBounds: Bounds, okBounds: Bounds): Inset {
  const targetX = mainBounds.minX;
  const targetY = mainBounds.minY;
  const tx = targetX - okBounds.minX;
  const ty = targetY - okBounds.minY;
  const right = targetX + (okBounds.maxX - okBounds.minX) + 18;
  const bottom = targetY + (okBounds.maxY - okBounds.minY) + 14;
  const line = `M${right} ${targetY - PAD}L${right} ${bottom - 28}L${right + 52} ${bottom + 20}`;
  return { transform: `translate(${tx} ${ty})`, line };
}

function shapeBody(options: RenderOptions): { body: string; viewBox: string } {
  const inset = options.okinawaInset === true;
  const fill = options.fill;
  const selected = options.selected ?? null;
  const interactive = options.interactive !== false;

  const mainland = prefectureFeatures.filter((p) => p.code !== OKINAWA);
  const bounds = ringsBounds((inset ? mainland : prefectureFeatures).map((p) => p.rings));
  const ok = inset
    ? okinawaInset(
        bounds,
        ringsBounds(prefectureFeatures.filter((p) => p.code === OKINAWA).map((p) => p.rings)),
      )
    : null;

  const parts = prefectureFeatures.map((pref, i) => {
    const transform = ok !== null && pref.code === OKINAWA ? ` transform="${ok.transform}"` : '';
    return (
      `<g ${prefAttrs(pref, i, selected, interactive)}${transform}>` +
      `<title>${escapeXml(pref.name)}</title>` +
      `<path class="nihonmap-shape" ${SHAPE_ATTRS} d="${ringsToPath(pref.rings)}"${fillStyle(fill, pref)}/>` +
      `</g>`
    );
  });
  if (ok !== null)
    parts.push(`<path class="nihonmap-inset-line" ${INSET_LINE_ATTRS} d="${ok.line}"/>`);

  const viewBox = [
    bounds.minX - PAD,
    bounds.minY - PAD,
    bounds.maxX - bounds.minX + PAD * 2,
    bounds.maxY - bounds.minY + PAD * 2,
  ].join(' ');
  return { body: parts.join(''), viewBox };
}

function gridBody(options: RenderOptions): { body: string; viewBox: string } {
  const fill = options.fill;
  const selected = options.selected ?? null;
  const labels = options.labels !== false;
  const interactive = options.interactive !== false;

  let maxCol = 0;
  let maxRow = 0;
  for (const [col, row] of gridPositions) {
    if (col > maxCol) maxCol = col;
    if (row > maxRow) maxRow = row;
  }

  const parts = prefectureFeatures.map((pref, i) => {
    const pos = gridPositions[pref.code - 1] ?? [0, 0];
    const x = pos[0] * PITCH;
    const y = pos[1] * PITCH;
    const label = labels
      ? `<text class="nihonmap-label" ${LABEL_ATTRS} x="${x + CELL / 2}" y="${y + CELL / 2 + 5}">${escapeXml(pref.short)}</text>`
      : '';
    return (
      `<g ${prefAttrs(pref, i, selected, interactive)}>` +
      `<title>${escapeXml(pref.name)}</title>` +
      `<rect class="nihonmap-cell" ${SHAPE_ATTRS} x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="10"${fillStyle(fill, pref)}/>` +
      label +
      `</g>`
    );
  });

  const viewBox = [
    -PAD,
    -PAD,
    maxCol * PITCH + CELL + PAD * 2,
    maxRow * PITCH + CELL + PAD * 2,
  ].join(' ');
  return { body: parts.join(''), viewBox };
}

/** 日本地図のSVGマークアップを生成する */
export function renderJapanMap(options: RenderOptions = {}): string {
  const { body, viewBox } =
    (options.mode ?? 'shape') === 'grid' ? gridBody(options) : shapeBody(options);
  const title = escapeXml(options.title ?? '日本地図');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="nihonmap" role="group" aria-label="${title}">` +
    body +
    `</svg>`
  );
}
