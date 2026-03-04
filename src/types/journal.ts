/**
 * 仕訳・仕訳行の型定義
 * 複式簿記の1伝票 = 日付 + 摘要 + 複数行（借方/貸方・勘定・金額・税区分）
 */

import type { AccountCode, DebitCredit } from './account.js';
import type { TaxCategory } from './tax.js';

/** 仕訳の1行（借方または貸方の1項目） */
export interface JournalLine {
  /** 借方 or 貸方 */
  side: DebitCredit;
  /** 勘定科目コード */
  account: AccountCode;
  /** 金額（正の整数。円単位を想定） */
  amount: number;
  /** 税区分（任意。将来の消費税計算用） */
  taxCategory?: TaxCategory;
  /** 行ごとのメモ（任意） */
  memo?: string;
}

/** 1件の仕訳（伝票） */
export interface JournalEntry {
  /** 取引日（YYYY-MM-DD 想定） */
  date: string;
  /** 摘要 */
  description: string;
  /** 仕訳行（1行以上。借方合計 = 貸方合計であること） */
  lines: JournalLine[];
  /** 将来: ユーザーID・証憑IDなど */
  meta?: Record<string, unknown>;
}

/** 正規化済み仕訳（エンジン出力。行順は借方→貸方に統一） */
export interface NormalizedJournalEntry extends JournalEntry {
  /** 検証・正規化済みであることを示すマーカー */
  _normalized: true;
}
