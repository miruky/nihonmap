import './style.css';
import {
  JapanMap,
  prefectureFeatures,
  quantileBreaks,
  type MapMode,
  type PrefectureFeature,
} from './lib';
import { population2020 } from './demo/population';
import { area2020 } from './demo/area';
import { searchPrefectures } from './demo/search';
import { buildStandaloneSvg } from './demo/export';
import {
  normalizeTheme,
  nextTheme,
  resolveTheme,
  themeLabel,
  THEME_KEY,
  type ResolvedTheme,
  type ThemePref,
} from './theme';

type Paint = 'population' | 'density' | 'region' | 'plain';

// 人口密度(人/km²)。人口は千人単位なので1000倍してから面積で割る
const density: Record<number, number> = {};
for (const pref of prefectureFeatures) {
  const pop = (population2020[pref.code] ?? 0) * 1000;
  const area = area2020[pref.code] ?? 1;
  density[pref.code] = Math.round(pop / area);
}

// 段彩の色は明暗で別に持つ。ダークでは「多いほど明るい」向きに反転させ、
// 沈んだ地色の上で値が読めるようにする(単なる反転でなく設計したダーク)
const RAMP_LIGHT = ['#e1ebf1', '#aecadd', '#7ba7c8', '#4b80ad', '#26527f'] as const;
const RAMP_DARK = ['#24333f', '#2f4f68', '#3d6e90', '#5b97bd', '#9cc6e6'] as const;

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

const popValues = prefectureFeatures.map((p) => population2020[p.code] ?? 0);
const popBreaks = quantileBreaks(popValues, RAMP_LIGHT.length);
const densityValues = prefectureFeatures.map((p) => density[p.code] ?? 0);
const densityBreaks = quantileBreaks(densityValues, RAMP_LIGHT.length);
const popRank = new Map(
  [...prefectureFeatures]
    .sort((a, b) => (population2020[b.code] ?? 0) - (population2020[a.code] ?? 0))
    .map((p, i) => [p.code, i + 1]),
);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const mapHost = document.getElementById('map') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;
const detail = document.getElementById('detail') as HTMLElement;
const legend = document.getElementById('legend') as HTMLElement;
const insetInput = document.getElementById('inset') as HTMLInputElement;
const paintSelect = document.getElementById('paint') as HTMLSelectElement;
const themeButton = document.getElementById('theme-toggle') as HTMLButtonElement;
const exportButton = document.getElementById('export') as HTMLButtonElement;
const searchBox = document.querySelector('.search') as HTMLElement;
const searchInput = document.getElementById('pref-search') as HTMLInputElement;
const searchResults = document.getElementById('search-results') as HTMLElement;
const modeButtons = [...document.querySelectorAll<HTMLButtonElement>('.segmented button')];

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // プライベートモード等で書けなくても表示は続行する
  }
}

// 表示状態(モード・塗り分け・沖縄別枠)はURLに残す。テーマはlocalStorageに持つ
const params = new URLSearchParams(location.search);
let mode: MapMode = params.get('mode') === 'grid' ? 'grid' : 'shape';
let paint: Paint =
  (['population', 'density', 'region', 'plain'] as const).find((v) => v === params.get('paint')) ??
  'population';
let inset = params.get('inset') !== '0';
let themePref: ThemePref = normalizeTheme(readStored(THEME_KEY));
let resolvedTheme: ResolvedTheme = resolveTheme(themePref, systemDark.matches);

function ramp(): readonly string[] {
  return resolvedTheme === 'dark' ? RAMP_DARK : RAMP_LIGHT;
}

function bucketOf(value: number, breaks: readonly number[]): number {
  let bucket = 0;
  for (let i = 0; i < breaks.length; i += 1) {
    if (value >= (breaks[i] ?? 0)) bucket = i;
  }
  return bucket;
}

function fillFor(active: Paint): ((pref: PrefectureFeature) => string | null) | undefined {
  const colors = ramp();
  if (active === 'population')
    return (pref) => colors[bucketOf(population2020[pref.code] ?? 0, popBreaks)] ?? null;
  if (active === 'density')
    return (pref) => colors[bucketOf(density[pref.code] ?? 0, densityBreaks)] ?? null;
  if (active === 'region') return (pref) => REGION_COLORS[pref.region] ?? null;
  return undefined;
}

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
    `<div><dt>面積</dt><dd>${format(area2020[pref.code] ?? 0)} km²</dd></div>` +
    `<div><dt>人口密度</dt><dd>${format(density[pref.code] ?? 0)} 人/km²</dd></div>` +
    `<div><dt>ローマ字</dt><dd>${pref.en}</dd></div>` +
    `</dl>` +
    `<button type="button" class="clear">選択を解除</button>`;
  const popValue = detail.querySelector<HTMLElement>('.pop-value');
  if (popValue !== null) countUp(popValue, pop);
  detail.querySelector('.clear')?.addEventListener('click', () => map.select(null));
}

function renderLegend(): void {
  const colors = ramp();
  if (paint === 'population' || paint === 'density') {
    const breaks = paint === 'population' ? popBreaks : densityBreaks;
    const unit = paint === 'population' ? '千人' : '人/km²';
    legend.innerHTML =
      colors
        .map((color, i) => {
          const from = breaks[i] ?? 0;
          return `<span class="key"><i style="background:${color}"></i>${format(from)}〜</span>`;
        })
        .join('') + `<span class="unit">${unit}</span>`;
  } else if (paint === 'region') {
    legend.innerHTML = Object.entries(REGION_COLORS)
      .map(
        ([name, color]) =>
          `<span class="key" data-region="${name}"><i style="background:${color}"></i>${name}</span>`,
      )
      .join('');
  } else {
    legend.innerHTML = '';
  }
}

/** 凡例の地方にホバーすると、その地方以外を地図上で沈める */
function highlightRegion(region: string | null): void {
  mapHost.classList.toggle('is-dimmed', region !== null);
  for (const group of mapHost.querySelectorAll('.nihonmap-pref')) {
    const muted = region !== null && group.getAttribute('data-region') !== region;
    group.classList.toggle('is-muted', muted);
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

function applyTheme(): void {
  resolvedTheme = resolveTheme(themePref, systemDark.matches);
  document.documentElement.dataset['theme'] = resolvedTheme;
  themeButton.textContent = `テーマ: ${themeLabel(themePref)}`;
  themeButton.setAttribute('aria-label', `表示テーマ: ${themeLabel(themePref)}(押すと切り替え)`);
  map.update({ fill: fillFor(paint) });
  renderLegend();
}

// 検索のコンボボックス

function clearSearch(): void {
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchResults.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
}

function renderSearch(): void {
  const matches = searchPrefectures(searchInput.value, prefectureFeatures).slice(0, 6);
  if (matches.length === 0) {
    searchResults.innerHTML = '';
    searchResults.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    return;
  }
  searchResults.innerHTML = matches
    .map(
      (p) =>
        `<li role="option"><button type="button" data-code="${p.code}"><span>${p.name}</span><span class="opt-kana">${p.kana}</span></button></li>`,
    )
    .join('');
  searchResults.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
}

function pickFromSearch(code: number): void {
  map.select(code);
  clearSearch();
  mapHost.querySelector<SVGGElement>(`.nihonmap-pref[data-code="${code}"]`)?.focus();
}

// イベント配線

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

themeButton.addEventListener('click', () => {
  themePref = nextTheme(themePref);
  writeStored(THEME_KEY, themePref);
  applyTheme();
});
systemDark.addEventListener('change', () => {
  if (themePref === 'system') applyTheme();
});

exportButton.addEventListener('click', () => {
  const svg = mapHost.querySelector('svg');
  if (svg === null) return;
  const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
  const doc = `<?xml version="1.0" encoding="UTF-8"?>\n${buildStandaloneSvg(svg.outerHTML, resolvedTheme, bg)}`;
  const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `nihonmap-${mode}-${paint}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('focus', renderSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const [first] = searchPrefectures(searchInput.value, prefectureFeatures);
    if (first !== undefined) {
      e.preventDefault();
      pickFromSearch(first.code);
    }
  } else if (e.key === 'Escape') {
    clearSearch();
    searchInput.blur();
  }
});
searchResults.addEventListener('click', (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-code]');
  if (button !== null) pickFromSearch(Number(button.dataset['code']));
});
document.addEventListener('click', (e) => {
  if (!searchBox.contains(e.target as Node)) clearSearch();
});

legend.addEventListener('mouseover', (e) => {
  if (paint !== 'region') return;
  const key = (e.target as HTMLElement).closest('[data-region]');
  highlightRegion(key === null ? null : key.getAttribute('data-region'));
});
legend.addEventListener('mouseleave', () => highlightRegion(null));

// スクロール出現(reduced-motionでは即表示。IntersectionObserver前提)
const revealEls = [...document.querySelectorAll('[data-reveal]')];
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of revealEls) io.observe(el);
} else {
  for (const el of revealEls) el.classList.add('is-visible');
}

// URL・保存値由来の初期状態をUIへ反映する
for (const button of modeButtons) {
  button.setAttribute('aria-pressed', String(button.dataset['mode'] === mode));
}
insetInput.checked = inset;
insetInput.disabled = mode === 'grid';
paintSelect.value = paint;

applyTheme();
renderDetail(null);
renderLegend();
