/**
 * 領収書解析 → 仕訳保存 の統合テスト
 * 実行: npx tsx src/testReceiptFlow.ts
 */

import { ReceiptAnalyzer } from './application/receiptAnalyzer.js';
import { JournalService } from './application/journalService.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';
import type { ExpenseType, PaymentMethod } from './journal/simpleEntry.js';

const spreadsheetId = '14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc';
const sheetName = 'Journal';

/** 解析結果の paymentMethod を JournalInput 用に変換 */
function normalizePaymentMethod(value: string): PaymentMethod {
  if (value === '現金') return '現金';
  if (value === 'クレジットカード' || value === 'クレカ') return 'クレカ';
  return '現金';
}

async function main() {
  const receiptText = `
    領収書
    2025年3月10日
    オフィス用品購入 3,200円
    現金にてお支払い
  `.trim();

  try {
    const analyzer = new ReceiptAnalyzer();
    const analysis = await analyzer.analyze(receiptText);

    const paymentMethod = normalizePaymentMethod(analysis.paymentMethod);
    const repo = new GoogleSheetsRepository(spreadsheetId, sheetName);
    const service = new JournalService(repo);

    await service.createAndSave({
      date: analysis.date,
      expenseType: analysis.expenseType as ExpenseType,
      amount: analysis.amount,
      paymentMethod,
    });

    console.log('自動保存完了');
  } catch (err) {
    console.error('エラー:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
