/**
 * メモリ上に仕訳を保持するリポジトリ実装
 */

import type { JournalRecord } from '../dto/journalRecord.js';
import type { JournalRepository } from './journalRepository.js';

export class MemoryRepository implements JournalRepository {
  private records: JournalRecord[] = [];

  save(record: JournalRecord): void {
    this.records.push(record);
  }

  findAll(): JournalRecord[] {
    return [...this.records];
  }
}
