/**
 * OCR全文と抽出結果を logs フォルダにJSONで保存
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = 'logs';

export interface OcrLogData {
  timestamp: string;
  storeName: string;
  receiptDate: string;
  amount: number;
  ocrText: string;
}

export function saveOcrLog(data: OcrLogData): void {
  try {
    mkdirSync(LOGS_DIR, { recursive: true });
    const filePath = join(LOGS_DIR, `${Date.now()}.json`);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('OCR log save error:', err);
  }
}
