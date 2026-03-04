import * as pdfjsLib from "pdfjs-dist";
import { categorizeTransaction } from "./categorizer";
import type { ParsedTransaction } from "./csvParser";

// Use the bundled worker via a blob URL so it works offline/on ICP
// pdfjs-dist 3.x ships a worker file we can inline
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url,
).toString();

// Extract raw text from a PDF file using bundled pdfjs
async function extractTextFromPdf(file: File): Promise<string> {
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
    const pageText = (textContent.items as Array<{ str: string }>)
      .map((item) => item.str)
      .join(" ");
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

  const gpayPattern =
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s+(.+?)\s+₹\s*([\d,]+\.?\d*)\s*(Debited|Credited|debited|credited)?/g;
  for (const match of text.matchAll(gpayPattern)) {
    const type = (match[4] || "").toLowerCase();
    if (type === "credited") continue;
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

  const simplePattern =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([A-Za-z][A-Za-z0-9\s\-_@.]{3,50}?)\s+([\d,]+\.\d{2})\s*(?:Dr|dr)?(?:\s|$)/g;
  for (const match of text.matchAll(simplePattern)) {
    const merchant = match[2].trim();
    if (merchant.length < 3) continue;
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
function parseBroadFallback(text: string): RawTransaction[] {
  const results: RawTransaction[] = [];
  const lines = text.split("\n");

  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/,
    /\b(\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/,
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/,
    /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/,
  ];

  const amountPattern = /₹\s*([\d,]+\.?\d*)|(?<!\d)([\d,]{1,8}\.\d{2})(?!\d)/;

  for (const line of lines) {
    if (
      /^(date|description|merchant|narration|particulars|amount|balance|dr|cr|debit|credit|transaction|ref|utr|opening|closing|total|s\.?no)/i.test(
        line.trim(),
      )
    )
      continue;
    if (line.trim().length < 8) continue;

    const isCreditOnly =
      /\b(credit|credited|CR)\b/i.test(line) &&
      !/\b(debit|debited|DR)\b/i.test(line);
    if (isCreditOnly) continue;

    let foundDate: string | null = null;
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        foundDate = m[1];
        break;
      }
    }
    if (!foundDate) continue;

    const amtMatch = line.match(amountPattern);
    if (!amtMatch) continue;
    const amount = (amtMatch[1] || amtMatch[2] || "").replace(/,/g, "");
    const amtNum = Number.parseFloat(amount);
    if (Number.isNaN(amtNum) || amtNum <= 0) continue;

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

  let rawTxns: RawTransaction[] = [];

  const gpay = parseGPayFormat(text);
  const phonePe = parsePhonePeFormat(text);
  const paytm = parsePaytmFormat(text);
  const generic = parseGenericUPIFormat(text);
  const broad = parseBroadFallback(text);

  const allResults = [gpay, phonePe, paytm, generic, broad];
  for (const results of allResults) {
    if (results.length > rawTxns.length) {
      rawTxns = results;
    }
  }

  rawTxns = deduplicateTransactions(rawTxns);

  if (rawTxns.length === 0) {
    throw new Error(
      "No transactions could be found in this PDF. " +
        "Please make sure you are uploading a statement downloaded directly from Google Pay, PhonePe, or Paytm.",
    );
  }

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
