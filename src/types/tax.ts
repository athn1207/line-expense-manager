/**
 * 税区分の型定義
 * 今は計算しないがカラムとして保持。将来の消費税対応用。
 */

/** 税区分（消費税対応時に使用） */
export type TaxCategory =
  | 'taxable'     // 課税（標準税率）
  | 'reduced'     // 軽減税率
  | 'exempt'      // 免税
  | 'non_taxable'; // 不課税

/** 税区分の表示名（将来のUI・出力用） */
export const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  taxable: '課税（標準）',
  reduced: '軽減税率',
  exempt: '免税',
  non_taxable: '不課税',
} as const;
