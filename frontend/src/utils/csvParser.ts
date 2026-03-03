import { categorizeTransaction, ExpenseCategory } from './categorizer';

export interface ParsedTransaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  rawRow: string;
}

function generateId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseAmount(raw: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[₹$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseDate(raw: string): string {
  const cleaned = raw.trim();
  // Try various date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
    // DD MMM YYYY (e.g., 01 Jan 2024)
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/,
    // MMM DD, YYYY
    /^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/,
  ];

  for (const fmt of formats) {
    const match = cleaned.match(fmt);
    if (match) {
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  // Fallback: try native Date parsing
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return cleaned;
}

function detectColumns(headers: string[]): {
  dateIdx: number;
  amountIdx: number;
  merchantIdx: number;
} {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const dateIdx = lower.findIndex((h) =>
    ['date', 'transaction date', 'txn date', 'value date', 'time', 'datetime'].some((k) => h.includes(k))
  );

  const amountIdx = lower.findIndex((h) =>
    ['amount', 'debit', 'credit', 'transaction amount', 'txn amount', 'dr', 'cr'].some((k) => h.includes(k))
  );

  const merchantIdx = lower.findIndex((h) =>
    ['description', 'merchant', 'narration', 'particulars', 'details', 'remarks', 'note', 'payee', 'name'].some((k) =>
      h.includes(k)
    )
  );

  return { dateIdx, amountIdx, merchantIdx };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('File appears to be empty or has no data rows.');
  }

  const headers = parseCSVLine(lines[0]);
  const { dateIdx, amountIdx, merchantIdx } = detectColumns(headers);

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error(
      'Could not detect required columns (date, amount) in the CSV. Please ensure your file has columns for date and amount.'
    );
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < Math.max(dateIdx, amountIdx, merchantIdx) + 1) continue;

    const rawDate = cols[dateIdx] || '';
    const rawAmount = cols[amountIdx] || '0';
    const rawMerchant = merchantIdx !== -1 ? cols[merchantIdx] : cols.join(' ');

    const amount = parseAmount(rawAmount);
    if (amount === 0) continue; // Skip zero-amount rows

    const merchant = rawMerchant.replace(/"/g, '').trim() || 'Unknown';
    const date = parseDate(rawDate);
    const category = categorizeTransaction(merchant);

    transactions.push({
      id: generateId(),
      date,
      merchant,
      amount,
      category,
      rawRow: line,
    });
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in the file. Please check the file format.');
  }

  return transactions;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
