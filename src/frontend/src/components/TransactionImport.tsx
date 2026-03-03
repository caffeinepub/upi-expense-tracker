import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Info,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { useAddTransaction } from "../hooks/useQueries";
import { ALL_CATEGORIES } from "../utils/categorizer";
import {
  type ParsedTransaction,
  parseCSV,
  readFileAsText,
} from "../utils/csvParser";
import { parsePDF } from "../utils/pdfParser";

interface TransactionImportProps {
  onImportComplete?: () => void;
}

type ImportStep = "upload" | "preview" | "success";

const TransactionImport: React.FC<TransactionImportProps> = ({
  onImportComplete,
}) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<
    ParsedTransaction[]
  >([]);
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<number, string>
  >({});
  const [importedCount, setImportedCount] = useState(0);

  const addTransactionMutation = useAddTransaction();

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      let transactions: ParsedTransaction[];

      if (file.name.toLowerCase().endsWith(".pdf")) {
        transactions = await parsePDF(file);
      } else {
        const text = await readFileAsText(file);
        transactions = parseCSV(text);
      }

      if (transactions.length === 0) {
        setError(
          "No transactions found in the file. Please check the file format and try again.",
        );
        setIsProcessing(false);
        return;
      }

      setParsedTransactions(transactions);
      setCategoryOverrides({});
      setStep("preview");
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to parse file. Please check the format and try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validExtensions = [".csv", ".txt", ".pdf"];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        setError("Please upload a CSV, TXT, or PDF file.");
        return;
      }

      processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleCategoryChange = useCallback(
    (index: number, category: string) => {
      setCategoryOverrides((prev) => ({ ...prev, [index]: category }));
    },
    [],
  );

  const handleConfirmImport = useCallback(async () => {
    setIsProcessing(true);
    let count = 0;

    for (let i = 0; i < parsedTransactions.length; i++) {
      const tx = parsedTransactions[i];
      const category = categoryOverrides[i] ?? tx.category;

      try {
        await addTransactionMutation.mutateAsync({
          id: `tx_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
          merchant: tx.merchant,
          amount: BigInt(tx.amount),
          timestamp: BigInt(new Date(tx.date).getTime() * 1_000_000),
          category_hint: category,
        });
        count++;
      } catch {
        // continue with remaining
      }
    }

    setImportedCount(count);
    setStep("success");
    setIsProcessing(false);
    onImportComplete?.();
  }, [
    parsedTransactions,
    categoryOverrides,
    addTransactionMutation,
    onImportComplete,
  ]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setError(null);
    setParsedTransactions([]);
    setCategoryOverrides({});
    setImportedCount(0);
  }, []);

  const formatAmount = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // ── Upload Step ──────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="space-y-4">
        {/* Drop zone */}
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer block
            ${
              isDragging
                ? "border-mint bg-mint/10"
                : "border-border hover:border-mint/60 hover:bg-surface/50"
            }`}
          htmlFor="file-input"
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.txt,.pdf"
            className="hidden"
            onChange={handleInputChange}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 text-mint animate-spin" />
              <p className="text-foreground font-medium">Parsing your file…</p>
              <p className="text-muted-foreground text-sm">
                This may take a moment for PDFs
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div>
                <p className="text-foreground font-medium">
                  Drop your file here
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  or click to browse
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                Supports CSV, TXT, and PDF
              </p>
            </div>
          )}
        </label>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-destructive font-medium text-sm">
                  Failed to parse file
                </p>
                <p className="text-destructive/80 text-sm mt-1 whitespace-pre-wrap">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-destructive/60 hover:text-destructive shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Tip for PDF errors */}
            {error.toLowerCase().includes("pdf") ||
            error.toLowerCase().includes("format") ? (
              <div className="flex items-start gap-2 pt-1 border-t border-destructive/20">
                <Info className="w-4 h-4 text-mint shrink-0 mt-0.5" />
                <p className="text-muted-foreground text-xs">
                  <span className="font-medium text-foreground">Tip:</span> For
                  best results, export your transactions as CSV from your UPI
                  app. PDF parsing works with digital statements from GPay,
                  PhonePe, and Paytm — scanned/image PDFs are not supported.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // ── Preview Step ─────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-mint" />
            <span className="font-medium text-foreground">
              {parsedTransactions.length} transaction
              {parsedTransactions.length !== 1 ? "s" : ""} found
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Merchant
                  </th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    Category
                  </th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedTransactions.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="px-3 py-2 text-foreground max-w-[160px] truncate">
                      {tx.merchant}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={categoryOverrides[i] ?? tx.category}
                        onChange={(e) =>
                          handleCategoryChange(i, e.target.value)
                        }
                        className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-mint"
                      >
                        {ALL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium whitespace-nowrap">
                      {formatAmount(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={isProcessing}
            className="bg-mint text-charcoal hover:bg-mint/90 font-semibold"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Import {parsedTransactions.length} Transaction
                {parsedTransactions.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Success Step ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="w-14 h-14 rounded-full bg-mint/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-mint" />
      </div>
      <div>
        <p className="text-foreground font-semibold text-lg">
          Import Complete!
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Successfully imported {importedCount} transaction
          {importedCount !== 1 ? "s" : ""}.
        </p>
      </div>
      <Button onClick={handleReset} variant="outline" className="mt-2">
        Import More
      </Button>
    </div>
  );
};

export default TransactionImport;
