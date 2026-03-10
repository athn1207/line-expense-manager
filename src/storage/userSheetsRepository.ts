/**
 * LINEユーザーと専用スプレッドシートの対応を管理するリポジトリ
 *
 * 管理用スプレッドシート（メインSPREADSHEET_ID 内の user_db シート）の構造:
 * A列: userId
 * B列: sheetName（そのユーザー専用のタブ名。原則 userId と同じ）
 * C列: createdAt (ISO文字列)
 *
 * 役割:
 * - userId から既存のスプレッドシート情報を取得
 * - なければ新しくスプレッドシートを作成し、user_db に1行追加
 */

import { google } from 'googleapis';

export interface UserSheetRow {
  userId: string;
  sheetName: string;
  createdAt: string;
}

export class UserSheetsRepository {
  constructor(
    /** メインのスプレッドシートID（SPREADSHEET_ID） */
    private spreadsheetId: string,
    /** ユーザー管理用シート名（例: user_db） */
    private userDbSheetName: string
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
      // 新しいスプレッドシートを作成できるように Drive 権限も付与
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  }

  /**
   * userId に紐づく「専用シート（タブ）」を取得（なければ作成）
   *
   * 戻り値:
   * - sheetName: ユーザー専用タブ名（原則 userId）
   * - isNew: user_db に新規登録された場合 true
   */
  async getOrCreateUserSheet(userId: string): Promise<{ sheetName: string; isNew: boolean }> {
    const auth = await this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const userDbRange = `${this.userDbSheetName}!A:C`;

    // 1. user_db から既存レコードを検索
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: userDbRange,
      });
      const rows = (res.data.values ?? []) as (string | number)[][];
      const found = rows.find((row) => row[0] === userId);
      if (found) {
        const sheetName = String(found[1] ?? userId);
        return { sheetName, isNew: false };
      }
    } catch (error) {
      // user_db シートが空 or 存在しない場合などは、そのまま新規作成フローへ
      console.warn('user_db 読み込み中にエラーが発生しましたが、新規作成フローを続行します:', error);
    }

    // 2. 見つからなければ、メインスプレッドシート内に新しいシート（タブ）を追加
    const sheetName = userId;

    // 2-1. 既に同名シートがないかを確認
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      includeGridData: false,
    });
    const existingTitles =
      meta.data.sheets?.map((s) => s.properties?.title).filter((t): t is string => !!t) ?? [];

    if (!existingTitles.includes(sheetName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // 2-2. ヘッダー行を設定（A:日付, B:店名, C:勘定科目, D:支払方法, E:金額）
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['日付', '店名', '勘定科目', '支払方法', '金額']],
        },
      });
    }

    const createdAt = new Date().toISOString();

    // 3. user_db に行を追加（appendRow / RAW 指定）
    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: userDbRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, sheetName, createdAt]],
      },
    });

    return {
      sheetName,
      isNew: true,
    };
  }

  /**
   * 指定ユーザーシートの全行を取得（A〜E）。重複チェック用。
   */
  async getUserSheetRows(sheetName: string): Promise<(string | number)[][]> {
    const auth = await this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
      });
      return (res.data.values ?? []) as (string | number)[][];
    } catch {
      return [];
    }
  }

  /**
   * 重複判定：同じ 日付・店名・金額（A, B, E列）が既に存在するか
   */
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

  /**
   * 経費1件をユーザー専用シートに追加
   * A 日付, B 店名, C 勘定科目, D 支払方法, E 金額
   */
  async appendReceiptRow(
    sheetName: string,
    params: { date: string; storeName: string; account: string; payment: string; amount: number }
  ): Promise<void> {
    const auth = await this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const dateStr = (params.date ?? '').replace(/-/g, '/');
    const row: (string | number)[] = [
      dateStr,
      params.storeName,
      params.account,
      params.payment,
      params.amount,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });
  }
}

