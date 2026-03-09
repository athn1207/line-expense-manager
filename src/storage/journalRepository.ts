/**
 * 仕訳の保存リポジトリインターフェース
 * Google Sheets 等の非同期保存に対応するため Promise を返す
 */

import type { JournalRecord } from '../dto/journalRecord.js';

export interface JournalRepository {
  save(record: JournalRecord): Promise<void>;
  findAll(): Promise<JournalRecord[]>;
}
