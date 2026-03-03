# Specification

## Summary
**Goal:** Fix the PDF parsing failure in the UPI Expense Tracker transaction import flow by replacing the CDN-based pdfjs loader with a locally bundled `pdfjs-dist` npm package.

**Planned changes:**
- Install `pdfjs-dist` as an npm dependency and remove the CDN-based dynamic import in `pdfParser.ts`
- Configure the PDF.js worker correctly (local worker URL or disabled worker) to avoid initialization errors
- Implement robust regex patterns to extract date, amount, and merchant/description fields from common UPI PDF formats (GPay, PhonePe, Paytm)
- Show a descriptive, user-friendly error message when a PDF yields zero transactions (unrecognized format) instead of a generic failure error
- Ensure parsed transactions continue to flow into the existing preview table and confirmation step
- Verify CSV/plain text import continues to work without regression

**User-visible outcome:** Users can upload UPI transaction PDFs (GPay, PhonePe, Paytm) without seeing a "failed to parse file" error, and parsed transactions appear in the import preview as expected. Unrecognized PDF formats show a helpful message explaining the limitation.
