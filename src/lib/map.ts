// インタラクティブな日本地図。renderの出力をホスト要素に流し込み、
// イベント委譲で選択とホバーを扱う。再描画してもリスナーは張り直さない。

import { prefectureFeatures } from './data/prefectures';
import { renderJapanMap } from './render';
import type { MapMode, PrefectureFeature, RenderOptions } from './types';

export interface JapanMapOptions extends Omit<RenderOptions, 'selected'> {
  /** 選択が変わったとき。選択解除はnull */
  onSelect?: (pref: PrefectureFeature | null) => void;
  /** ポインタが乗った・離れたとき。離れたらnull */
  onHover?: (pref: PrefectureFeature | null) => void;
}

export function prefectureByCode(code: number): PrefectureFeature | undefined {
  return prefectureFeatures.find((p) => p.code === code);
}

export class JapanMap {
  readonly host: HTMLElement;
  private options: JapanMapOptions;
  private current: number | null = null;
  private hovered: number | null = null;
  private readonly abort = new AbortController();

  constructor(host: HTMLElement, options: JapanMapOptions = {}) {
    this.host = host;
    this.options = options;
    const { signal } = this.abort;
    host.addEventListener('click', (e) => this.pick(e.target, () => this.toggle(e.target)), {
      signal,
    });
    host.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        this.pick(e.target, () => {
          e.preventDefault();
          this.toggle(e.target);
        });
      },
      { signal },
    );
    host.addEventListener('mouseover', (e) => this.hover(this.codeOf(e.target)), { signal });
    host.addEventListener('mouseout', () => this.hover(null), { signal });
    this.render();
  }

  private codeOf(target: EventTarget | null): number | null {
    if (!(target instanceof Element)) return null;
    const group = target.closest('.nihonmap-pref');
    if (group === null) return null;
    const code = Number(group.getAttribute('data-code'));
    return Number.isInteger(code) ? code : null;
  }

  private pick(target: EventTarget | null, run: () => void): void {
    if (this.codeOf(target) !== null) run();
  }

  private toggle(target: EventTarget | null): void {
    const code = this.codeOf(target);
    if (code === null) return;
    this.select(this.current === code ? null : code);
  }

  private hover(code: number | null): void {
    if (code === this.hovered) return;
    this.hovered = code;
    this.options.onHover?.(code === null ? null : (prefectureByCode(code) ?? null));
  }

  /** 選択状態をDOMの差し替えなしで切り替える(フォーカスを保つ) */
  select(code: number | null): void {
    if (code === this.current) return;
    this.current = code;
    for (const group of this.host.querySelectorAll('.nihonmap-pref')) {
      const isSelected = Number(group.getAttribute('data-code')) === code;
      group.classList.toggle('is-selected', isSelected);
      if (group.hasAttribute('aria-pressed')) {
        group.setAttribute('aria-pressed', String(isSelected));
      }
    }
    this.options.onSelect?.(code === null ? null : (prefectureByCode(code) ?? null));
  }

  get selected(): number | null {
    return this.current;
  }

  get mode(): MapMode {
    return this.options.mode ?? 'shape';
  }

  /** 描画オプションを差し替えて描き直す */
  update(options: Partial<JapanMapOptions>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  render(): void {
    this.host.innerHTML = renderJapanMap({ ...this.options, selected: this.current });
  }

  destroy(): void {
    this.abort.abort();
    this.host.innerHTML = '';
  }
}
