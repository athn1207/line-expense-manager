/**
 * 領収書解析 → 仕訳 → Google Sheets保存 を1つのサービスにまとめる
 */

import { ReceiptAnalyzer } from './receiptAnalyzer.js';
import type { ReceiptAnalysisResult } from './receiptAnalyzer.js';
import type { JournalService } from './journalService.js';
import type { PaymentMethod } from '../journal/simpleEntry.js';

function toPaymentMethod(value: string): PaymentMethod {
  if (value === '現金') return '現金';
  if (value === 'クレジットカード') return 'クレカ';
  return '現金';
}

export class ReceiptPipelineService {
  constructor(private journalService: JournalService) {}

  /**
   * 領収書テキストを解析し、仕訳して保存する。成功時は解析結果を返す。
   */
  async process(text: string): Promise<ReceiptAnalysisResult> {
    try {
      console.log('領収書解析開始:', text);
      const analyzer = new ReceiptAnalyzer();
      const result = await analyzer.analyze(text);
      console.log('解析結果:', result);
      await this.journalService.createAndSave({
        date: result.date,
        expenseType: result.expenseType,
        amount: result.amount,
        paymentMethod: toPaymentMethod(result.paymentMethod),
      });
      console.log('スプシ保存完了');
      return result;
    } catch (error) {
      console.error('receiptPipeline error:', error);
      throw error;
    }
  }
}
