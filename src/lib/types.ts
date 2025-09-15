// nihonmapの公開型。

/** 都道府県1件の描画データとメタ情報 */
export interface PrefectureFeature {
  /** JIS X 0401の都道府県コード(1〜47) */
  code: number;
  /** 正式名称(東京都・大阪府・北海道・〜県) */
  name: string;
  /** 接尾辞を除いた略称(北海道のみそのまま) */
  short: string;
  /** ひらがな読み(接尾辞なし) */
  kana: string;
  /** ローマ字表記 */
  en: string;
  /** 八地方区分 */
  region: string;
  /** 投影済み座標の輪郭。各輪郭は [x0, y0, x1, y1, ...] の平坦な配列 */
  rings: readonly (readonly number[])[];
}

/** 経緯度を地図座標へ変換するためのパラメータ */
export interface ProjectionParams {
  cosLat: number;
  minX: number;
  minY: number;
  scale: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type MapMode = 'shape' | 'grid';

export interface RenderOptions {
  /** 描画モード。既定はshape(実形状) */
  mode?: MapMode;
  /** 沖縄県を左上に枠付きで移す。shapeモードのみ有効 */
  okinawaInset?: boolean;
  /** 都道府県ごとの塗り色。未指定・null返しはCSSに委ねる */
  fill?: (pref: PrefectureFeature) => string | null | undefined;
  /** 選択中の都道府県コード。aria-pressedとis-selectedクラスが付く */
  selected?: number | null;
  /** gridモードで略称ラベルを描く。既定true */
  labels?: boolean;
  /** SVGのaria-label。既定は「日本地図」 */
  title?: string;
  /** 各都道府県をフォーカス・クリック可能にする。既定true */
  interactive?: boolean;
}
