import { FileText, Shield, Smartphone } from "lucide-react";
import React from "react";
import TransactionImport from "../components/TransactionImport";

const APP_GUIDES = [
  {
    app: "Google Pay (GPay)",
    emoji: "🟢",
    steps: [
      "Open GPay → tap your profile photo",
      'Go to "Manage Google Account" → Data & Privacy',
      'Select "Download your data" (Google Takeout)',
      "Choose Google Pay data and export as CSV or PDF",
      "Upload the downloaded file here",
    ],
  },
  {
    app: "PhonePe",
    emoji: "🟣",
    steps: [
      "Open PhonePe → tap the History icon",
      "Tap the download/share icon at the top right",
      'Select date range and choose "Download Statement"',
      "The statement will be sent to your registered email as PDF or CSV",
      "Upload the downloaded file here",
    ],
  },
  {
    app: "Paytm",
    emoji: "🔵",
    steps: [
      'Open Paytm → go to "Passbook"',
      "Tap the filter/download icon",
      'Select date range and tap "Download Statement"',
      "Choose PDF or CSV format",
      "Upload the downloaded file here",
    ],
  },
];

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Import Transactions
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload your UPI transaction export to automatically categorize and
          track your expenses.
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-mint/10 border border-mint/30">
        <Shield className="w-5 h-5 text-mint shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Your data stays private
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            All file parsing happens entirely in your browser. No raw file
            content is ever sent to any server. Only the structured transaction
            data you choose to import is stored on-chain under your identity.
          </p>
        </div>
      </div>

      {/* Import Component */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-card">
        <TransactionImport />
      </div>

      {/* Supported Formats */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-mint" />
          <h2 className="text-base font-semibold text-foreground">
            Supported File Formats
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              ext: "CSV",
              desc: "Comma-separated values export from any UPI app",
            },
            { ext: "TXT", desc: "Plain text transaction history files" },
            {
              ext: "PDF",
              desc: "PDF statement exports from GPay, PhonePe, and Paytm",
            },
          ].map(({ ext, desc }) => (
            <div
              key={ext}
              className="flex flex-col gap-1 p-3 rounded-xl bg-background border border-border"
            >
              <span className="text-xs font-bold text-mint tracking-widest">
                .{ext}
              </span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-App Export Guides */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-mint" />
          <h2 className="text-base font-semibold text-foreground">
            How to Export from Your UPI App
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {APP_GUIDES.map((guide) => (
            <div
              key={guide.app}
              className="bg-surface rounded-2xl p-5 border border-border shadow-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{guide.emoji}</span>
                <h3 className="font-semibold text-foreground">{guide.app}</h3>
              </div>
              <ol className="space-y-1.5 list-none">
                {guide.steps.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-mint/15 text-mint text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
