/**
 * Google Sheets に仕訳を保存するリポジトリ実装
 * サービスアカウント（JWT）認証を使用
 */

import { google } from 'googleapis';
import type { JournalRecord } from '../dto/journalRecord.js';
import type { JournalRepository } from './journalRepository.js';

export class GoogleSheetsRepository implements JournalRepository {
  constructor(
    private spreadsheetId: string,
    private sheetName: string
  ) {}

  async save(record: JournalRecord): Promise<void> {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error(
        '環境変数 GOOGLE_CLIENT_EMAIL と GOOGLE_PRIVATE_KEY を設定してください'
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      [
        record.date,
        record.debitAccount,
        record.creditAccount,
        record.debitAmount,
        record.creditAmount,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async findAll(): Promise<JournalRecord[]> {
    throw new Error('Not implemented');
  }
}
