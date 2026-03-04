import { categorizeTransaction } from "./categorizer";
import type { ParsedTransaction } from "./csvParser";

// Dynamically load pdfjs-dist from CDN (avoids bundler/package dependency issues)
let pdfjsLoadPromise: Promise<PdfjsLib> | null = null;

interface PdfjsTextItem {
  str: string;
}

interface PdfjsTextContent {
  items: PdfjsTextItem[];
}

interface PdfjsPage {
  getTextContent(): Promise<PdfjsTextContent>;
}

interface PdfjsPdf {
  numPages: number;
  getPage(pageNum: number): Promise<PdfjsPage>;
}

interface PdfjsLoadingTask {
  promise: Promise<PdfjsPdf>;
}

interface PdfjsGetDocumentParams {
  data: Uint8Array;
  useWorkerFetch?: boolean;
  isEvalSupported?: boolean;
  useSystemFonts?: boolean;
}

interface PdfjsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(params: PdfjsGetDocumentParams): PdfjsLoadingTask;
}

function loadPdfjsFromCDN(): Promise<PdfjsLib> {
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise<PdfjsLib>((resolve, reject) => {
    // Check if already loaded
    const win = window as Window & { pdfjsLib?: PdfjsLib };
    if (win.pdfjsLib) {
      resolve(win.pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as Window & { pdfjsLib?: PdfjsLib }).pdfjsLib;
      if (!lib) {
        reject(new Error("pdfjs-dist failed to initialize after script load"));
        return;
      }
      // Point the worker to CDN as well
      lib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = () => {
      reject(
        new Error(
          "Could not load PDF reader library. Please check your internet connection and try again.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}

// Extract raw text from a PDF file using pdfjs loaded from CDN
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfjsFromCDN();

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += `${pageText}\n`;
  }

  return fullText;
}

// Normalize text: collapse multiple spaces, trim lines
function normalizeText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// Parse date strings in various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const day = Number.parseInt(dmy[1]);
    const month = Number.parseInt(dmy[2]) - 1;
    const year = Number.parseInt(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const ymd = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const d = new Date(
      Number.parseInt(ymd[1]),
      Number.parseInt(ymd[2]) - 1,
      Number.parseInt(ymd[3]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  // DD MMM YYYY or DD-MMM-YYYY
  const dMonthY = dateStr.match(
    /(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,](\d{2,4})/,
  );
  if (dMonthY) {
    const d = new Date(`${dMonthY[1]} ${dMonthY[2]} ${dMonthY[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // MMM DD, YYYY
  const monthDY = dateStr.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDY) {
    const d = new Date(`${monthDY[1]} ${monthDY[2]}, ${monthDY[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

// Parse amount from string, returns paise (integer)
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.replace(/[₹$,\s]/g, "").replace(/[^\d.]/g, "");
  const val = Number.parseFloat(cleaned);
  if (Number.isNaN(val) || val <= 0) return 0;
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
  const gpayPattern =
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+(.+?)\s+₹\s*([\d,]+\.?\d*)\s*(Debited|Credited|debited|credited)?/g;
  for (const match of text.matchAll(gpayPattern)) {
    const type = (match[4] || "").toLowerCase();
    if (type === "credited") continue; // skip incoming
    results.push({
      date: match[1],
      merchant: match[2].trim(),
      amount: match[3],
      type: "debit",
    });
  }

  return results;
}

// PhonePe statement patterns
function parsePhonePeFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // PhonePe format: date, merchant, amount in columns
  // "15/01/2024 Payment to Swiggy 450.00 Dr"
  const phonePePattern =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:Payment to|Paid to|Transfer to|UPI-|UPI\/)?([A-Za-z0-9\s\-_@.]+?)\s+([\d,]+\.?\d*)\s*(?:Dr|CR|Cr|dr)?/gi;
  for (const match of text.matchAll(phonePePattern)) {
    const afterAmount = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 10,
    );
    const isCr = /\bCr\b|\bCR\b|\bcredit\b/i.test(match[0] + afterAmount);
    if (isCr) continue;
    const merchant = match[2]
      .trim()
      .replace(/^(Payment to|Paid to|Transfer to|UPI-|UPI\/)/i, "")
      .trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  return results;
}

// Paytm statement patterns — handles both old and new Paytm PDF formats
function parsePaytmFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // --- New Paytm format (2024+) ---
  // Paytm now directly provides bank-style PDFs.
  // Format 1: "15 Jan 2024 ... merchant ... ₹450.00 ... Debit"
  const paytmNew1 =
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+([A-Za-z0-9\s\-_@./&]+?)\s+₹?\s*([\d,]+\.?\d*)\s*(?:Debit|DR|Dr|debit)?/gi;
  for (const match of text.matchAll(paytmNew1)) {
    const typeContext = text.slice(
      match.index,
      (match.index ?? 0) + match[0].length + 20,
    );
    const isCr =
      /Credit|CR\b|Cr\b/i.test(typeContext) &&
      !/Debit|DR\b|Dr\b/i.test(typeContext);
    if (isCr) continue;
    const merchant = match[2]
      .trim()
      .replace(/^(UPI[-\/]|Payment to|Paid to|Sent to|Transfer to)/i, "")
      .trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  // Format 2: "15/01/2024 ... merchant ... ₹450" (new Paytm with slash dates)
  const paytmNew2 =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([A-Za-z0-9\s\-_@./&]+?)\s+₹?\s*([\d,]+\.?\d*)\s*(?:Debit|DR|Dr)?/gi;
  for (const match of text.matchAll(paytmNew2)) {
    const typeContext = text.slice(
      match.index,
      (match.index ?? 0) + match[0].length + 20,
    );
    const isCr =
      /Credit|CR\b|Cr\b/i.test(typeContext) &&
      !/Debit|DR\b|Dr\b/i.test(typeContext);
    if (isCr) continue;
    const merchant = match[2]
      .trim()
      .replace(/^(UPI[-\/]|Payment to|Paid to|Sent to|Transfer to)/i, "")
      .trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  // Format 3 (old Paytm): "Jan 15, 2024 Paid to Swiggy ₹450"
  const paytmOld =
    /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s+(?:Paid to|Payment to|Sent to|Transfer to)?\s*([A-Za-z0-9\s\-_@.]+?)\s+₹\s*([\d,]+\.?\d*)/gi;
  for (const match of text.matchAll(paytmOld)) {
    const merchant = match[2].trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  // Format 4: Paytm tabular format — lines like:
  // "15-Jan-2024 UPI/merchant@bank 450.00 Debit"
  const paytmTabular =
    /(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+(?:UPI[\/\-])?([A-Za-z0-9\s\-_@./&]+?)\s+([\d,]+\.?\d{2})\s*(Debit|Debit\s|DR\b)?/gi;
  for (const match of text.matchAll(paytmTabular)) {
    const merchant = match[2].trim().split(/[@\/]/)[0].trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  return results;
}

// Generic UPI bank statement pattern
function parseGenericUPIFormat(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];

  // Generic: date followed by UPI ref and merchant
  // "15-01-2024 UPI/CR/123456/Swiggy/SBI 450.00 Dr"
  const upiPattern =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+UPI[\/\-\s](?:DR|CR|P2M|P2P|COLL)?[\/\-\s]*(?:\d+[\/\-\s])?([A-Za-z0-9\s\-_.@]+?)\s+([\d,]+\.?\d*)\s*(Dr|Cr|DR|CR)?/gi;
  for (const match of text.matchAll(upiPattern)) {
    const typeStr = (match[4] || "").toLowerCase();
    if (typeStr === "cr") continue;
    const merchant = match[2].trim().split("/")[0].trim();
    if (merchant.length < 2) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  // Also try: date, description with amount at end
  // "15/01/2024 Swiggy Food Order 450.00"
  const simplePattern =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([A-Za-z][A-Za-z0-9\s\-_@.]{3,50}?)\s+([\d,]+\.\d{2})\s*(?:Dr|dr)?(?:\s|$)/g;
  for (const match of text.matchAll(simplePattern)) {
    const merchant = match[2].trim();
    if (merchant.length < 3) continue;
    // Skip if looks like a header
    if (/date|amount|balance|transaction|description/i.test(merchant)) continue;
    results.push({
      date: match[1],
      merchant,
      amount: match[3],
      type: "debit",
    });
  }

  return results;
}

// Last-resort broad scan: extract any line that has a date and a rupee amount
// Works on any structured PDF including new Paytm/bank formats
function parseBroadFallback(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];
  const lines = text.split("\n");

  // Date patterns we can recognise
  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/, // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/, // DD MMM YYYY
    /\b(\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/, // DD-MMM-YY
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/, // MMM DD, YYYY
    /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/, // YYYY-MM-DD
  ];

  // Amount pattern: ₹ or plain number with decimal in a debit context
  const amountPattern = /₹\s*([\d,]+\.?\d*)|(?<!\d)([\d,]{1,8}\.\d{2})(?!\d)/;

  for (const line of lines) {
    // Skip obvious headers
    if (
      /^(date|description|merchant|narration|particulars|amount|balance|dr|cr|debit|credit|transaction|ref|utr|opening|closing|total|s\.?no)/i.test(
        line.trim(),
      )
    )
      continue;
    if (line.trim().length < 8) continue;

    // Detect credit-only lines (skip them)
    const isCreditOnly =
      /\b(credit|credited|CR)\b/i.test(line) &&
      !/\b(debit|debited|DR)\b/i.test(line);
    if (isCreditOnly) continue;

    // Find a date
    let foundDate: string | null = null;
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        foundDate = m[1];
        break;
      }
    }
    if (!foundDate) continue;

    // Find an amount
    const amtMatch = line.match(amountPattern);
    if (!amtMatch) continue;
    const amount = (amtMatch[1] || amtMatch[2] || "").replace(/,/g, "");
    const amtNum = Number.parseFloat(amount);
    if (Number.isNaN(amtNum) || amtNum <= 0) continue;

    // Extract merchant: whatever is between date and amount, stripped of UPI/ref noise
    let merchant = line
      .replace(foundDate, "")
      .replace(amtMatch[0], "")
      .replace(
        /\b(UPI|IMPS|NEFT|RTGS|REF|UTR|TXN|ID|NO|Debit|Credit|DR|CR|Debited|Credited)\b[\s\/\-#]*[\dA-Za-z]*/gi,
        " ",
      )
      .replace(/[₹\d,]+\.\d{2}/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Clean leading/trailing punctuation
    merchant = merchant.replace(/^[\s\-_\/.,|:]+|[\s\-_\/.,|:]+$/g, "").trim();
    if (merchant.length < 2) continue;

    results.push({ date: foundDate, merchant, amount, type: "debit" });
  }

  return results;
}

// Deduplicate transactions by date+amount+merchant
function deduplicateTransactions(txns: RawTransaction[]): RawTransaction[] {
  const seen = new Set<string>();
  return txns.filter((t) => {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new Error(
      `Failed to read PDF file: ${msg}. Please make sure it is a valid, non-password-protected PDF.`,
    );
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      "This PDF appears to be empty or image-based (scanned). Only text-based PDFs are supported. " +
        "Please export a digital statement from your UPI app instead of scanning a printed copy.",
    );
  }

  const text = normalizeText(rawText);

  // Try all parsers and collect results
  let rawTxns: RawTransaction[] = [];

  const gpay = parseGPayFormat(text);
  const phonePe = parsePhonePeFormat(text);
  const paytm = parsePaytmFormat(text);
  const generic = parseGenericUPIFormat(text);
  const broad = parseBroadFallback(text);

  // Use the parser that found the most results
  const allResults = [gpay, phonePe, paytm, generic, broad];
  for (const results of allResults) {
    if (results.length > rawTxns.length) {
      rawTxns = results;
    }
  }

  // Deduplicate
  rawTxns = deduplicateTransactions(rawTxns);

  if (rawTxns.length === 0) {
    throw new Error(
      "No transactions could be found in this PDF. " +
        "Please make sure you are uploading a statement downloaded directly from Google Pay, PhonePe, or Paytm.",
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
      date: date.toISOString().split("T")[0],
      amount: amountPaise,
      merchant,
      category,
      rawRow: `${raw.date},${raw.amount},${merchant}`,
    });
  }

  if (parsed.length === 0) {
    throw new Error(
      "Transactions were detected but could not be parsed correctly (invalid dates or amounts). " +
        "Please download a fresh statement directly from your UPI app and try again.",
    );
  }

  return parsed;
}
