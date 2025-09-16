// デモのテーマ切替。light / dark / system の3状態を巡回し、
// system のときだけ OS 設定を見て具体的な light|dark に解決する。
// 解決結果は <html data-theme> に書き、CSS はメディアクエリでなく
// この属性だけで配色を切り替える(描画前に確定するのでFOUCが出ない)。

export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'nihonmap:theme';

const ORDER: readonly ThemePref[] = ['system', 'light', 'dark'];

/** 保存値を妥当なThemePrefへ正規化する。未知の値や欠落はsystem扱い */
export function normalizeTheme(value: string | null): ThemePref {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/** systemをOSの配色設定で具体化する。明示指定はOS設定を無視する */
export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/** トグルの巡回順(system → light → dark → system) */
export function nextTheme(pref: ThemePref): ThemePref {
  const i = ORDER.indexOf(pref);
  return ORDER[(i + 1) % ORDER.length] ?? 'system';
}

/** ボタンに出す短い日本語ラベル */
export function themeLabel(pref: ThemePref): string {
  if (pref === 'light') return 'ライト';
  if (pref === 'dark') return 'ダーク';
  return 'システム';
}
