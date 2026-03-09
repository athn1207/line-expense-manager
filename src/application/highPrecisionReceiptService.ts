/**
 * 領収書レコードの組み立て（店舗辞書・金額・日付・店舗学習）
 * 出力: receiptDate, storeName, amount → 既存のスプレッドシート保存に渡す
 */

import type { ReceiptRecord } from '../dto/receiptRecord.js';
import {
  normalizeText,
  extractStoreName,
  extractAmount,
  extractReceiptDate,
  determineAccount,
  storeKeywords,
} from './receiptParser.js';

/** OCR全文から帳簿用レコードを組み立てる。payment は既存ロジックで "現金" */
export function buildReceiptRecord(ocrText: string): ReceiptRecord {
  const normalized = normalizeText(ocrText);
  const storeName = extractStoreName(ocrText);
  const amount = extractAmount(ocrText);
  const receiptDate = extractReceiptDate(ocrText);

  if (!storeKeywords.includes(storeName)) {
    console.log('新店舗候補:', storeName);
  }
  console.log('[領収書OCR] 店名=', storeName, '金額=', amount, '円');

  const account = determineAccount(storeName, normalized);

  return {
    date: receiptDate,
    vendor: storeName,
    account,
    payment: '現金',
    amount,
  };
}
