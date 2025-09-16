// デモの都道府県絞り込み。正式名称・略称・読み・ローマ字・コードで探す。
// 入力のゆれを吸収するため、カタカナはひらがなへ畳み、全角半角と大小を正規化する。

import type { PrefectureFeature } from '../lib';

const KATAKANA = /[ァ-ヶ]/g;

function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .replace(KATAKANA, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * クエリに一致する都道府県を、コード順(=入力配列の順)で返す。
 * 名称・読み・ローマ字は部分一致、コードは完全一致。空クエリは空配列。
 */
export function searchPrefectures(
  query: string,
  features: readonly PrefectureFeature[],
): PrefectureFeature[] {
  const q = normalize(query);
  if (q === '') return [];
  return features.filter((p) => {
    if (String(p.code) === q) return true;
    return (
      normalize(p.name).includes(q) ||
      normalize(p.short).includes(q) ||
      normalize(p.kana).includes(q) ||
      normalize(p.en).includes(q)
    );
  });
}
