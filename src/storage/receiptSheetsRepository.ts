/**
 * 領収書を帳簿用スプレッドシートに保存（A〜E列）
 * 重複判定用の既存行取得・CSVエクスポートを追加
 */

import { writeFileSync } from 'node:fs';
import { google } from 'googleapis';
import type { ReceiptRecord } from '../dto/receiptRecord.js';

export class ReceiptSheetsRepository {
  constructor(
    private spreadsheetId: string,
    private sheetName: string
  ) {}

  private async getAuth() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!clientEmail || !privateKey) {
      throw new Error('環境変数 GOOGLE_CLIENT_EMAIL と GOOGLE_PRIVATE_KEY を設定してください');
    }
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  /** 日付を YYYY/MM/DD に変換（帳簿表示用） */
  private formatDateForSheet(isoDate: string): string {
    return (isoDate ?? '').replace(/-/g, '/');
  }

  /** 既存の全行を取得（A〜E）。重複チェック・CSVエクスポート用 */
  async getExistingRows(): Promise<(string | number)[][]> {
    const auth = await this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:E`,
      });
      const rows = (res.data.values ?? []) as (string | number)[][];
      return rows;
    } catch {
      return [];
    }
  }

  /** 重複判定：日付・店名・金額が同一の行が既に存在するか（判定キー: 日付+店名+金額） */
  isDuplicate(
    sheetData: (string | number)[][],
    receiptDate: string,
    storeName: string,
    amount: number
  ): boolean {
    const dateStr = (receiptDate ?? '').replace(/-/g, '/');
    return sheetData.some(
      (row) =>
        row[0] === dateStr &&
        row[1] === storeName &&
        String(row[4]) === String(amount)
    );
  }

  /** 1件追加（A=日付, B=支払い先, C=勘定科目, D=支払方法, E=金額） */
  async append(record: ReceiptRecord): Promise<void> {
    const auth = await this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const row: (string | number)[] = [
      this.formatDateForSheet(record.date ?? ''),
      String(record.vendor ?? ''),
      String(record.account ?? ''),
      String(record.payment ?? ''),
      record.amount,
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  }

  /** 現在のスプレッドシートデータをCSVで出力 */
  async exportToCSV(filePath = 'receipts_export.csv'): Promise<void> {
    const data = await this.getExistingRows();
    exportCSV(data, filePath);
  }
}

/** 二次元配列をCSV文字列にしてファイルに保存 */
export function exportCSV(data: (string | number)[][], filePath = 'receipts_export.csv'): void {
  const csv = data.map((row) => row.map((cell) => String(cell)).join(',')).join('\n');
  writeFileSync(filePath, csv, 'utf8');
  console.log('CSV exported:', filePath);
}
