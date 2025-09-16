// コロプレス(段彩図)向けの小さな色スケール。

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (m === null) throw new Error(`6桁の16進カラーではありません: ${hex}`);
  const n = parseInt(m[1] ?? '', 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** 2色をt(0〜1)で線形補間する */
export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const clamped = Math.max(0, Math.min(1, t));
  return toHex(a.map((v, i) => v + ((b[i] ?? 0) - v) * clamped));
}

/**
 * 値域を2色のグラデーションへ写す連続スケール。
 * 値域外の値は端へ丸める。最小値と最大値が等しい場合は終端色を返す。
 */
export function linearColorScale(
  domain: readonly [number, number],
  range: readonly [string, string],
): (value: number) => string {
  const [d0, d1] = domain;
  const span = d1 - d0;
  return (value) => (span === 0 ? range[1] : mixHex(range[0], range[1], (value - d0) / span));
}

/**
 * 標本をn分位で区切るしきい値(各階級の下限)をcount個返す。
 * 先頭は最小値。標本が空なら全要素0。人口のように偏った分布の階級分けに使う。
 */
export function quantileBreaks(values: readonly number[], count: number): number[] {
  if (count <= 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  return Array.from({ length: count }, (_, i) =>
    sorted.length === 0 ? 0 : (sorted[Math.floor((sorted.length * i) / count)] ?? 0),
  );
}

/**
 * 値の分布をn分位で割る離散スケール。各階級の件数がほぼ均等になるよう、
 * しきい値を標本から定める。等間隔(quantizeColorScale)が一部の色に偏る、
 * 人口のような裾の長い分布で見やすい段彩になる。色の数が段数を決める。
 */
export function quantileColorScale(
  values: readonly number[],
  colors: readonly string[],
): (value: number) => string {
  if (colors.length === 0) throw new Error('色を1つ以上指定する');
  const breaks = quantileBreaks(values, colors.length);
  return (value) => {
    let bucket = 0;
    for (let i = 0; i < breaks.length; i += 1) {
      if (value >= (breaks[i] ?? 0)) bucket = i;
    }
    return colors[bucket] ?? '';
  };
}

/** 値域をn段階に区切る離散スケール。色の数が段数を決める */
export function quantizeColorScale(
  domain: readonly [number, number],
  colors: readonly string[],
): (value: number) => string {
  if (colors.length === 0) throw new Error('色を1つ以上指定する');
  const [d0, d1] = domain;
  const span = d1 - d0;
  return (value) => {
    if (span === 0) return colors[colors.length - 1] ?? '';
    const i = Math.floor(((value - d0) / span) * colors.length);
    return colors[Math.max(0, Math.min(colors.length - 1, i))] ?? '';
  };
}
