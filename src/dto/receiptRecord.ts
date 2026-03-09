/**
 * 領収書1件の帳簿用DTO（安定性重視・A〜E列のみ）
 * OCRから取得するのは日付・支払い先・金額。勘定科目・支払方法は既存ロジック。
 */
export interface ReceiptRecord {
  date: string;
  vendor: string;
  account: string;
  payment: string;
  amount: number;
}
