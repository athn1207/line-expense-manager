/**
 * メモリ上に仕訳を保持するリポジトリ実装
 */

import type { JournalRecord } from '../dto/journalRecord.js';
import type { JournalRepository } from './journalRepository.js';

export class MemoryRepository implements JournalRepository {
  private records: JournalRecord[] = [];

  async save(record: JournalRecord): Promise<void> {
    this.records.push(record);
  }

  async findAll(): Promise<JournalRecord[]> {
    return [...this.records];
  }
}
