/**
 * 仕訳の保存リポジトリインターフェース
 */

import type { JournalRecord } from '../dto/journalRecord.js';

export interface JournalRepository {
  save(record: JournalRecord): void;
  findAll(): JournalRecord[];
}
