import type { ParsedTransaction } from './csvParser';
import { categorizeTransaction } from './categorizer';

// We load PDF.js from a reliable CDN with proper worker setup
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;

  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).pdfjsLib) {
      pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      resolve(pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        reject(new Error('PDF.js failed to initialize'));
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library'));
    document.head.appendChild(script);
  });
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Normalize text: collapse multiple spaces, trim lines
function normalizeText(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// Parse date strings in various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1]);
    const month = parseInt(dmy[2]) - 1;
    const year = parseInt(dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const ymd = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // DD MMM YYYY or DD-MMM-YYYY
  const dMonthY = dateStr.match(/(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,](\d{2,4})/);
  if (dMonthY) {
    const d = new Date(`${dMonthY[1]} ${dMonthY[2]} ${dMonthY[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // MMM DD, YYYY
  const monthDY = dateStr.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDY) {
    const d = new Date(`${monthDY[1]} ${monthDY[2]}, ${monthDY[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// Parse amount from string, returns paise (integer)
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.replace(/[₹$,\s]/g, '').replace(/[^\d.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0) return 0;
  return Math.round(val * 100); // store as paise
}

function generateId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface RawTransaction {
  date: string;
  amount: string;
  merchant: string;
  type?: string; // 'debit' | 'credit'
}

// GPay / Google Pay statement patterns
function parseGPayFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // GPay format: "DD MMM YYYY ... merchant ... ₹amount"
  // Example: "15 Jan 2024 Swiggy ₹450.00 Debited"
  const gpayPattern = /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+(.+?)\s+₹\s*([\d,]+\.?\d*)\s*(Debited|Credited|debited|credited)?/g;
  let match;
  while ((match = gpayPattern.exec(text)) !== null) {
    const type = (match[4] || '').toLowerCase();
    if (type === 'credited') continue; // skip incoming
    results.push({
      date: match[1],
      merchant: match[2].trim(),
      amount: match[3],
      type: 'debit',
    });
  }

  return results;
}

// PhonePe statement patterns
function parsePhonePeFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // PhonePe format: date, merchant, amount in columns
  // "15/01/2024 Payment to Swiggy 450.00 Dr"
  const phonePePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:Payment to|Paid to|Transfer to|UPI-|UPI\/)?([A-Za-z0-9\s\-_@.]+?)\s+([\d,]+\.?\d*)\s*(?:Dr|CR|Cr|dr)?/gi;
  let match;
  while ((match = phonePePattern.exec(text)) !== null) {
    const afterAmount = text.slice(match.index + match[0].length, match.index + match[0].length + 10);
    const isCr = /\bCr\b|\bCR\b|\bcredit\b/i.test(match[0] + afterAmount);
    if (isCr) continue;
    const merchant = match[2].trim().replace(/^(Payment to|Paid to|Transfer to|UPI-|UPI\/)/i, '').trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: 'debit',
    });
  }

  return results;
}

// Paytm statement patterns
function parsePaytmFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // Paytm: "Jan 15, 2024 Paid to Swiggy ₹450"
  const paytmPattern = /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s+(?:Paid to|Payment to|Sent to|Transfer to)?\s*([A-Za-z0-9\s\-_@.]+?)\s+₹\s*([\d,]+\.?\d*)/gi;
  let match;
  while ((match = paytmPattern.exec(text)) !== null) {
    const merchant = match[2].trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: 'debit',
    });
  }

  return results;
}

// Generic UPI bank statement pattern
function parseGenericUPIFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // Generic: date followed by UPI ref and merchant
  // "15-01-2024 UPI/CR/123456/Swiggy/SBI 450.00 Dr"
  const upiPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+UPI[\/\-\s](?:DR|CR|P2M|P2P|COLL)?[\/\-\s]*(?:\d+[\/\-\s])?([A-Za-z0-9\s\-_.@]+?)\s+([\d,]+\.?\d*)\s*(Dr|Cr|DR|CR)?/gi;
  let match;
  while ((match = upiPattern.exec(text)) !== null) {
    const typeStr = (match[4] || '').toLowerCase();
    if (typeStr === 'cr') continue;
    const merchant = match[2].trim().split('/')[0].trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: 'debit',
    });
  }

  // Also try: date, description with amount at end
  // "15/01/2024 Swiggy Food Order 450.00"
  const simplePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([A-Za-z][A-Za-z0-9\s\-_@.]{3,50}?)\s+([\d,]+\.\d{2})\s*(?:Dr|dr)?(?:\s|$)/g;
  while ((match = simplePattern.exec(text)) !== null) {
    const merchant = match[2].trim();
    if (merchant.length < 3) continue;
    // Skip if looks like a header
    if (/date|amount|balance|transaction|description/i.test(merchant)) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: 'debit',
    });
  }

  return results;
}

// Deduplicate transactions by date+amount+merchant
function deduplicateTransactions(txns: RawTransaction[]): RawTransaction[] {
  const seen = new Set<string>();
  return txns.filter(t => {
    const key = `${t.date}|${t.amount}|${t.merchant.toLowerCase().slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function parsePDF(file: File): Promise<ParsedTransaction[]> {
  let rawText: string;

  try {
    rawText = await extractTextFromPdf(file);
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    if (msg.includes('Failed to load PDF.js') || msg.includes('PDF.js failed')) {
      throw new Error(
        'Could not load the PDF parsing library. Please check your internet connection and try again.'
      );
    }
    throw new Error(`Failed to read PDF file: ${msg}`);
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      'This PDF appears to be empty or image-based (scanned). Only text-based PDFs are supported. ' +
      'Please export a digital statement from your UPI app instead of scanning a printed copy.'
    );
  }

  const text = normalizeText(rawText);

  // Try all parsers and collect results
  let rawTxns: RawTransaction[] = [];

  const gpay = parseGPayFormat(text);
  const phonePe = parsePhonePeFormat(text);
  const paytm = parsePaytmFormat(text);
  const generic = parseGenericUPIFormat(text);

  // Use the parser that found the most results
  const allResults = [gpay, phonePe, paytm, generic];
  for (const results of allResults) {
    if (results.length > rawTxns.length) {
      rawTxns = results;
    }
  }

  // Deduplicate
  rawTxns = deduplicateTransactions(rawTxns);

  if (rawTxns.length === 0) {
    throw new Error(
      'No transactions could be found in this PDF. ' +
      'This may be because the PDF format is not yet supported. ' +
      'Supported formats: Google Pay, PhonePe, Paytm, and standard UPI bank statements. ' +
      'Tip: Try exporting as CSV from your app instead — CSV import works with all formats.'
    );
  }

  // Convert to ParsedTransaction
  const parsed: ParsedTransaction[] = [];
  for (const raw of rawTxns) {
    const date = parseDate(raw.date);
    if (!date) continue;

    const amountPaise = parseAmount(raw.amount);
    if (amountPaise <= 0) continue;

    const merchant = raw.merchant.trim();
    const category = categorizeTransaction(merchant);

    parsed.push({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      amount: amountPaise,
      merchant,
      category,
      rawRow: `${raw.date},${raw.amount},${merchant}`,
    });
  }

  if (parsed.length === 0) {
    throw new Error(
      'Transactions were detected but could not be parsed correctly (invalid dates or amounts). ' +
      'Please try exporting as CSV from your UPI app for better compatibility.'
    );
  }

  return parsed;
}
