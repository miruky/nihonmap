import './style.css';
import { JapanMap, prefectureFeatures, type MapMode, type PrefectureFeature } from './lib';
import { population2020 } from './demo/population';

type Paint = 'population' | 'region' | 'plain';

const POPULATION_COLORS = ['#dbe7f0', '#aac8de', '#7da9cb', '#5187b3', '#2f6695'];
const REGION_COLORS: Readonly<Record<string, string>> = {
  北海道: '#7da9cb',
  東北: '#8fbca9',
  関東: '#c9a87c',
  中部: '#b3a2c7',
  近畿: '#cb8f8f',
  中国: '#a3b87f',
  四国: '#86b8b4',
  '九州・沖縄': '#c799c2',
};

// 人口は偏りが大きいので、等間隔ではなく等頻度(分位)で5階級に割る
const sortedValues = prefectureFeatures
  .map((p) => population2020[p.code] ?? 0)
  .sort((a, b) => a - b);
const popBreaks = POPULATION_COLORS.map(
  (_, i) => sortedValues[Math.floor((sortedValues.length * i) / POPULATION_COLORS.length)] ?? 0,
);
function popColor(value: number): string {
  let bucket = 0;
  for (let i = 0; i < popBreaks.length; i += 1) {
    if (value >= (popBreaks[i] ?? 0)) bucket = i;
  }
  return POPULATION_COLORS[bucket] ?? '';
}
const popRank = new Map(
  [...prefectureFeatures]
    .sort((a, b) => (population2020[b.code] ?? 0) - (population2020[a.code] ?? 0))
    .map((p, i) => [p.code, i + 1]),
);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function fillFor(paint: Paint): ((pref: PrefectureFeature) => string | null) | undefined {
  if (paint === 'population') return (pref) => popColor(population2020[pref.code] ?? 0);
  if (paint === 'region') return (pref) => REGION_COLORS[pref.region] ?? null;
  return undefined;
}

const mapHost = document.getElementById('map') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;
const detail = document.getElementById('detail') as HTMLElement;
const legend = document.getElementById('legend') as HTMLElement;
const insetInput = document.getElementById('inset') as HTMLInputElement;
const paintSelect = document.getElementById('paint') as HTMLSelectElement;
const modeButtons = [...document.querySelectorAll<HTMLButtonElement>('.segmented button')];

// 表示状態はURLクエリに残す。リンクを開けば同じ表示が再現される
const params = new URLSearchParams(location.search);
let mode: MapMode = params.get('mode') === 'grid' ? 'grid' : 'shape';
let paint: Paint =
  (['population', 'region', 'plain'] as const).find((v) => v === params.get('paint')) ??
  'population';
let inset = params.get('inset') !== '0';

const map = new JapanMap(mapHost, {
  mode,
  okinawaInset: inset,
  fill: fillFor(paint),
  onSelect: renderDetail,
  onHover: showTooltip,
});

function syncUrl(): void {
  const q = new URLSearchParams();
  if (mode !== 'shape') q.set('mode', mode);
  if (paint !== 'population') q.set('paint', paint);
  if (!inset) q.set('inset', '0');
  const query = q.toString();
  history.replaceState(null, '', query === '' ? location.pathname : `?${query}`);
}

function format(n: number): string {
  return n.toLocaleString('ja-JP');
}

function showTooltip(pref: PrefectureFeature | null): void {
  if (pref === null) {
    tooltip.hidden = true;
    return;
  }
  const pop = population2020[pref.code] ?? 0;
  tooltip.innerHTML = `<strong>${pref.name}</strong><span>${pref.kana}</span><em>${format(pop)}千人</em>`;
  tooltip.hidden = false;
}

function moveTooltip(e: MouseEvent): void {
  if (tooltip.hidden) return;
  const pad = 14;
  const rect = tooltip.getBoundingClientRect();
  const x = Math.min(e.clientX + pad, window.innerWidth - rect.width - 8);
  const y = Math.min(e.clientY + pad, window.innerHeight - rect.height - 8);
  tooltip.style.translate = `${x}px ${y}px`;
}

/** 数字を一拍で数え上げる。reduced-motionでは即値を出す */
function countUp(el: HTMLElement, target: number): void {
  if (reducedMotion.matches) {
    el.textContent = format(target);
    return;
  }
  const start = performance.now();
  const duration = 450;
  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = format(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderDetail(pref: PrefectureFeature | null): void {
  if (pref === null) {
    detail.innerHTML =
      '<p class="placeholder">都道府県を選ぶと詳細が出る。クリックのほか、Tabキーで地図を辿ってEnterでも選べる。</p>';
    return;
  }
  const pop = population2020[pref.code] ?? 0;
  detail.innerHTML =
    `<p class="kana">${pref.kana}</p>` +
    `<h2>${pref.name}</h2>` +
    `<dl>` +
    `<div><dt>地方</dt><dd>${pref.region}</dd></div>` +
    `<div><dt>人口(2020)</dt><dd><span class="pop-value">0</span>千人</dd></div>` +
    `<div><dt>人口順位</dt><dd>${popRank.get(pref.code) ?? '-'} / 47</dd></div>` +
    `<div><dt>ローマ字</dt><dd>${pref.en}</dd></div>` +
    `</dl>` +
    `<button type="button" class="clear">選択を解除</button>`;
  const popValue = detail.querySelector<HTMLElement>('.pop-value');
  if (popValue !== null) countUp(popValue, pop);
  detail.querySelector('.clear')?.addEventListener('click', () => map.select(null));
}

function renderLegend(): void {
  if (paint === 'population') {
    legend.innerHTML = POPULATION_COLORS.map((color, i) => {
      const from = popBreaks[i] ?? 0;
      return `<span class="key"><i style="background:${color}"></i>${format(from)}〜</span>`;
    }).join('');
    legend.insertAdjacentHTML('beforeend', '<span class="unit">千人</span>');
  } else if (paint === 'region') {
    legend.innerHTML = Object.entries(REGION_COLORS)
      .map(([name, color]) => `<span class="key"><i style="background:${color}"></i>${name}</span>`)
      .join('');
  } else {
    legend.innerHTML = '';
  }
}

function setMode(next: MapMode): void {
  mode = next;
  for (const button of modeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset['mode'] === mode));
  }
  insetInput.disabled = mode === 'grid';
  map.update({ mode });
  syncUrl();
}

for (const button of modeButtons) {
  button.addEventListener('click', () => setMode(button.dataset['mode'] as MapMode));
}
insetInput.addEventListener('change', () => {
  inset = insetInput.checked;
  map.update({ okinawaInset: inset });
  syncUrl();
});
paintSelect.addEventListener('change', () => {
  paint = paintSelect.value as Paint;
  map.update({ fill: fillFor(paint) });
  renderLegend();
  syncUrl();
});
mapHost.addEventListener('mousemove', moveTooltip);
mapHost.addEventListener('mouseleave', () => showTooltip(null));

// URL由来の初期状態をUIへ反映する
for (const button of modeButtons) {
  button.setAttribute('aria-pressed', String(button.dataset['mode'] === mode));
}
insetInput.checked = inset;
insetInput.disabled = mode === 'grid';
paintSelect.value = paint;

renderDetail(null);
renderLegend();
