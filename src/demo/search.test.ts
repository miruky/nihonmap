import { describe, expect, it } from 'vitest';
import { prefectureFeatures } from '../lib';
import { searchPrefectures } from './search';

const names = (q: string): string[] => searchPrefectures(q, prefectureFeatures).map((p) => p.name);

describe('searchPrefectures', () => {
  it('空クエリ・空白のみは空配列', () => {
    expect(searchPrefectures('', prefectureFeatures)).toEqual([]);
    expect(searchPrefectures('   ', prefectureFeatures)).toEqual([]);
  });

  it('正式名称・略称の部分一致で引ける', () => {
    expect(names('東京')).toContain('東京都');
    expect(names('大阪')).toContain('大阪府');
  });

  it('カタカナの読みはひらがなへ畳んで一致する', () => {
    expect(names('ヒロシマ')).toEqual(['広島県']);
    expect(names('ほっかいどう')).toEqual(['北海道']);
  });

  it('ローマ字は大文字小文字を無視する', () => {
    expect(names('KYOTO')).toContain('京都府');
    expect(names('okinawa')).toEqual(['沖縄県']);
  });

  it('都道府県コードの完全一致で引ける', () => {
    expect(names('13')).toEqual(['東京都']);
    expect(names('47')).toEqual(['沖縄県']);
  });

  it('結果はコード順を保つ', () => {
    const codes = searchPrefectures('県', prefectureFeatures).map((p) => p.code);
    expect(codes).toEqual([...codes].sort((a, b) => a - b));
  });

  it('該当が無ければ空', () => {
    expect(names('架空県')).toEqual([]);
  });
});
