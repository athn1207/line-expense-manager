/**
 * CLI から領収書を入力し、解析→Google Sheets 保存まで実行する
 * 実行: npm run receipt
 */

import * as readline from 'node:readline';
import { ReceiptAnalyzer } from './application/receiptAnalyzer.js';
import { JournalService } from './application/journalService.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';
import type { PaymentMethod } from './journal/simpleEntry.js';

const spreadsheetId = '14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc';
const sheetName = 'Journal';

function toPaymentMethod(value: string): PaymentMethod {
  if (value === '現金') return '現金';
  if (value === 'クレジットカード') return 'クレカ';
  return '現金';
}

/** 領収書テキストを ReceiptAnalyzer で解析する */
async function analyzeReceipt(text: string) {
  const analyzer = new ReceiptAnalyzer();
  return analyzer.analyze(text);
}

function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('領収書内容を入力してください: ', async (line) => {
    rl.close();

    const text = line.trim();
    if (!text) {
      console.error('エラー: 入力が空です');
      process.exitCode = 1;
      return;
    }

    try {
      const analysis = await analyzeReceipt(text);
      const repo = new GoogleSheetsRepository(spreadsheetId, sheetName);
      const service = new JournalService(repo);

      await service.createAndSave({
        date: analysis.date,
        expenseType: analysis.expenseType,
        amount: analysis.amount,
        paymentMethod: toPaymentMethod(analysis.paymentMethod),
      });

      console.log('スプシ保存完了');
    } catch (err) {
      console.error('エラー:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });
}

main();
