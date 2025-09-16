# nihonmap

[![CI](https://github.com/miruky/nihonmap/actions/workflows/ci.yml/badge.svg)](https://github.com/miruky/nihonmap/actions/workflows/ci.yml)
[![Deploy](https://github.com/miruky/nihonmap/actions/workflows/deploy.yml/badge.svg)](https://github.com/miruky/nihonmap/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**依存ゼロ・53KBの描画データで動く、都道府県SVG日本地図ライブラリ+デモ**

デモ: https://miruky.github.io/nihonmap/

## 概要

nihonmapは、47都道府県の日本地図をSVGで描くTypeScriptライブラリである。実形状(Natural Earth由来の簡略化ポリゴン)とタイルグリッド(全県を同じ大きさの角丸タイルで並べるカルトグラム)の2モードを持ち、コロプレス(段彩図)用の塗り分けコールバック、クリック・キーボードによる選択、ホバー通知を備える。描画はSVG文字列を組み立てる純関数で、DOMが無い環境でもそのまま使える。

各都道府県にはコード(JIS X 0401)・正式名称・読み・ローマ字・八地方区分のメタ情報が付く。さらに `geoJsonToPath` で手持ちのGeoJSON(市区町村境界など)を同じ投影・同じ座標系のSVGパスへ変換できるので、同梱データに無い細かい境界も重ねて描ける。

### なぜ作ったのか

日本地図を1枚描きたいだけのとき、D3と地形データ一式を持ち込むのは大げさで、かといって既成のSVG画像は塗り分けや対話ができない。「データは前処理して整数座標で同梱し、実行時は純粋な文字列組み立てだけにする」と割り切れば、依存ゼロで軽く、テストもしやすいライブラリになると考えて作った。境界の精度は市区町村レベルの厳密さを求めない可視化用途(ダッシュボード、統計の塗り分け)に絞っている。

## アーキテクチャ

![nihonmapのアーキテクチャ図](docs/architecture.svg)

## 技術スタック

| カテゴリ             | 技術                                                    |
| :------------------- | :------------------------------------------------------ |
| 言語                 | TypeScript 5(strict、ライブラリ本体は実行時依存ゼロ)    |
| 境界データ           | Natural Earth 1:10m admin-1(パブリックドメイン)を前処理 |
| デモ                 | Vite 6                                                  |
| テスト               | Vitest + happy-dom(DOMが要るテストのみ)                 |
| リンタ・フォーマッタ | ESLint(typescript-eslint)+ Prettier                     |
| CI / 配信            | GitHub Actions / GitHub Pages                           |

## 使い方

### SVG文字列を作る

```ts
import { renderJapanMap } from './lib';

// 既定: 実形状モード、フォーカス可能な47個のボタン
document.getElementById('map')!.innerHTML = renderJapanMap();

// グリッドモード + 塗り分け
const svg = renderJapanMap({
  mode: 'grid',
  fill: (pref) => (pref.region === '近畿' ? '#cb8f8f' : null), // nullはCSSに委ねる
  okinawaInset: true, // shapeモードで沖縄を左上の別枠へ
});
```

出力の各都道府県は `class="nihonmap-pref" data-code="13" data-region="関東"` を持つ `<g>` で、`<title>` とaria-labelが付く。見た目はプレゼンテーション属性で与えてあるため、`.nihonmap-shape { fill: ... }` のようなCSSだけで上書きできる。

### 対話的に使う(JapanMap)

```ts
import { JapanMap } from './lib';

const map = new JapanMap(document.getElementById('map')!, {
  okinawaInset: true,
  fill: (pref) => colorOf(pref.code),
  onSelect: (pref) => console.log(pref?.name ?? '選択解除'),
  onHover: (pref) => tooltip.show(pref),
});

map.update({ mode: 'grid' }); // 再描画(選択は保持、リスナーは張り直さない)
map.select(13); // コード指定で選択
map.destroy();
```

クリックとEnter/Spaceで選択がトグルし、`is-selected` クラスと `aria-pressed` が切り替わる。選択の反映はDOMの差し替えなしに行うので、キーボードのフォーカス位置が失われない。

### メタ情報と色スケール

```ts
import { prefectureFeatures, prefectureByCode, linearColorScale } from './lib';

prefectureByCode(13);
// { code: 13, name: '東京都', short: '東京', kana: 'とうきょう',
//   en: 'Tokyo', region: '関東', rings: [...] }

const scale = linearColorScale([0, 100], ['#dbe7f0', '#2f6695']);
scale(50); // '#85a7c3'(等間隔)。quantizeColorScaleは離散n段階
```

### 手持ちのGeoJSONを重ねる

```ts
import { geoJsonToPath, lonLatToXY } from './lib';

// 国土数値情報などの市区町村ポリゴンを同じ座標系のパスへ
const d = geoJsonToPath(municipalityGeoJson);
svg.insertAdjacentHTML('beforeend', `<path d="${d}" fill="none" stroke="#b00"/>`);

lonLatToXY([139.6917, 35.6895]); // 任意の経緯度を地図座標へ
```

### 境界データの再生成

`src/lib/data/prefectures.ts` は生成物としてコミット済みなので、通常は再生成不要。簡略化の強さや島の間引き閾値を変えたいときだけ実行する。

```bash
curl -L -o /tmp/ne_10m_admin1.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
node scripts/build-data.mjs /tmp/ne_10m_admin1.geojson
```

## プロジェクト構成

- `src/lib/` — ライブラリ本体(実行時依存ゼロ)
  - `data/prefectures.ts` — 生成された47都道府県の整数座標とメタ情報
  - `data/grid.ts` — タイルグリッドの手作業レイアウト
  - `geometry.ts` — 投影・パス化・GeoJSON変換
  - `color.ts` — 連続・離散の色スケール
  - `render.ts` — SVG文字列を組み立てる純関数
  - `map.ts` — イベント委譲つきの `JapanMap` クラス
- `src/demo/` — デモ専用データ(2020年国勢調査の人口)
- `src/main.ts` / `src/style.css` / `index.html` — デモページ
- `scripts/build-data.mjs` — Natural Earthからのデータ生成
- `docs/` — アーキテクチャ図・ロゴ

## はじめ方

### 前提条件

Node.js 22以降。

### セットアップ

```bash
git clone https://github.com/miruky/nihonmap.git
cd nihonmap
npm ci
npm run dev
```

### テストの実行

```bash
npm test
```

### Lintの実行

```bash
npm run lint
```

### デプロイ

mainへのpushで `deploy.yml` がGitHub Pagesへ公開する。サブパス配信のため `NIHONMAP_BASE=/nihonmap/` をビルド時に渡している。

## 設計方針

- **データは前処理、実行時は文字列組み立てだけ** — 39MBのNatural Earthをビルドスクリプトで日本だけに絞り、Douglas-Peuckerで簡略化して整数座標へ量子化する。実行時に届くのは53KBのTypeScriptモジュールで、パースも投影計算も発生しない。
- **見た目の既定はプレゼンテーション属性で** — SVGの `fill` / `stroke` 属性はどんなCSS規則よりも優先度が低い。既定の配色を属性で埋め込みつつ、利用側はクラスセレクタ1つで完全に上書きできる。塗り分けコールバックだけはインラインstyleにして、CSSより必ず勝つようにしている。
- **アクセシビリティを描画段階で持たせる** — 各都道府県は `role="button"`・`tabindex`・`aria-label`・`<title>` 付きで生成され、選択は `aria-pressed` に反映される。後付けでなくレンダラの仕様として組み込んだ。
- **割り切った精度** — 境界は可視化向けの簡略形状で、面積15km²未満の島と沖ノ鳥島・南鳥島は含めない。市区町村境界は同梱せず、`geoJsonToPath` で外部データを受け入れる口だけを用意した。

## ライセンス

コードは [MIT](LICENSE)。境界データの出典はNatural Earth(パブリックドメイン)、デモの人口は総務省統計局「令和2年国勢調査」による。
