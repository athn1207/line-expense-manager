import { JournalService } from './application/journalService.js';
import { GoogleSheetsRepository } from './storage/googleSheetsRepository.js';

const spreadsheetId = "14zc49qa_n_I_ZkNAyIbTAebDOX_pkh7hr1rRr9Uprmc";
const sheetName = "Journal";

const repo = new GoogleSheetsRepository(spreadsheetId, sheetName);
const service = new JournalService(repo);

await service.createAndSave({
  date: "2026-03-05",
  expenseType: "交通費",
  amount: 1000,
  paymentMethod: "現金",
});

console.log("保存完了");