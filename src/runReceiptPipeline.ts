/**
 * 領収書テキスト → GPT解析 → JournalService → GoogleSheetsRepository → スプレッドシート保存
 * 実行: npx tsx src/runReceiptPipeline.ts
 */
import'dotenv/config'
import { ReceiptPipelineService } from './application/receiptPipelineService.js';
import { JournalService } from './application/journalService.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';

const spreadsheetId = '14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc';
const sheetName = 'Journal';

const receiptText = `2026年3月5日
電車代
1200円
現金`;

async function main() {
  try {
    const repo = new GoogleSheetsRepository(spreadsheetId, sheetName);
    const journalService = new JournalService(repo);
    const pipelineService = new ReceiptPipelineService(journalService);

    await pipelineService.process(receiptText);
  } catch (err) {
    console.error('エラー:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
