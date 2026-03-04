/**
 * 勘定区分（五勘定）・勘定科目の型定義
 * 青色申告・複式簿記の基礎。将来の科目マスタ拡張を考慮。
 */

/** 勘定区分（複式簿記の五勘定） */
export type AccountCategory =
  | 'asset'      // 資産
  | 'liability'  // 負債
  | 'equity'     // 純資産
  | 'revenue'    // 収益
  | 'expense';   // 費用

/** 借方・貸方 */
export type DebitCredit = 'debit' | 'credit';

/**
 * 勘定科目コード（拡張可能な文字列リテラル）
 * 実運用ではマスタで管理し、ここでは代表例のみ定義
 */
export type AccountCode =
  // 資産
  | 'cash'
  | 'bank'
  | 'accounts_receivable'
  | 'inventory'
  // 負債
  | 'accounts_payable'
  | 'loans_payable'
  // 純資産
  | 'capital'
  | 'retained_earnings'
  // 収益
  | 'sales'
  | 'other_income'
  // 費用
  | 'expense_office'
  | 'expense_utilities'
  | 'expense_travel'
  | 'expense_other'
  | (string & {}); // 将来の科目追加を許容

/** 勘定科目のメタ情報（マスタ用。将来の拡張） */
export interface AccountMasterItem {
  code: AccountCode;
  name: string;
  category: AccountCategory;
}
