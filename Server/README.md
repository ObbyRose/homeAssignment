# File Reader Backend

## Overview

This backend provides document comparison services for PDF, Word, and Excel files. It splits documents into chunks, compares them, and generates reports highlighting the differences.

---

## Architecture

- **Express.js** server
- **MongoDB** with GridFS for file storage
- **PDFKit** for PDF generation
- **Mammoth** for Word extraction
- **ExcelJS** for Excel extraction
- **diff** library for text comparison

---

## Main Endpoints

| Method | Endpoint                | Description                                 |
|--------|------------------------|---------------------------------------------|
| POST   | `/upload`              | Upload two files for comparison             |
| POST   | `/compare/:id`         | Run comparison for uploaded files           |
| GET    | `/download/:id`        | Download the generated comparison report    |
| GET    | `/details/:id`         | Get comparison metadata                     |

---

## Services

- **splitDocumentToChunks.ts**: Splits files into manageable text chunks.
- **compareChunksWithAi.ts**: Compares chunks and marks differences.
- **createPdfWithDiff.ts**: Generates a PDF report with colored differences.
- **createWordWithDiff.ts**: Generates a Word report with differences.
- **createExcelWithDiff.ts**: Generates an Excel report with differences.

---

## How Chunking and Comparison Works

1. **Chunking**:  
   - Documents are split into chunks by sentences/paragraphs for accurate alignment.
2. **Comparison**:  
   - Each chunk is compared using the `diff` library.
   - Differences are colored: red for removals (original), blue for additions (modified).
3. **Report Generation**:  
   - A PDF/Word/Excel file is generated with the differences highlighted.

---

## Running the Backend

```bash
cd Server
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the `Server` directory with the following (fill in the next values):
PORT=5000
NODE_ENV="development"
MONGO_URI=mongodb+srv://dreapet41s:admin@filereader.z0hi01b.mongodb.net/?retryWrites=true&w=majority&appName=FileReader