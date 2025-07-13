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
- **compareChunks.ts**: Compares chunks and marks differences using diff algorithm.
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

## How to Read the Generated PDF Report

The generated PDF report contains a detailed comparison of your documents with the following structure:

### 📋 **Report Header**
- **Title**: "Comparison Report" at the top of the document
- **File Information**: Details about the compared files

### 📄 **Chunk-by-Chunk Analysis**
Each section in the report represents a chunk (text segment) from your documents:

#### **Chunk Number**
- Each chunk is labeled with `Chunk #X` where X is the sequential number

#### **Original Text Section**
- **Header**: "Original:" (underlined)
- **Content**: Text from the first document (File A)
- **Color Coding**:
  - 🔴 **Red text**: Text that was removed in the modified version
  - ⚫ **Black text**: Text that remains unchanged

#### **Modified Text Section**
- **Header**: "Modified:" (underlined)  
- **Content**: Text from the second document (File B)
- **Color Coding**:
  - 🔵 **Blue text**: Text that was added in the modified version
  - ⚫ **Black text**: Text that remains unchanged

#### **No Difference Indicator**
- If a chunk has no differences, it will show "No difference" in gray text

#### **Empty Content Indicator**
- **`[EMPTY]`** appears when one document has content in a chunk while the other document has no content in that same position
- This indicates a structural difference where content exists in one version but is completely absent in the other
- **Example**: If File A has a paragraph that File B doesn't have, you'll see:
  ```
  Original: This is the missing paragraph content.
  Modified: [EMPTY]
  ```
- **Reverse Example**: If File B has content that File A doesn't have:
  ```
  Original: [EMPTY]
  Modified: This is the new paragraph content.
  ```

### 🎨 **Visual Examples**

**Example 1 - Text with Changes:**
```
Original: This is the ~~old~~ text that needs to be updated.
Modified: This is the **new** text that needs to be updated.
```

**Example 2 - Added Content:**
```
Original: This is the original text.
Modified: This is the original text **with additional information**.
```

**Example 3 - Removed Content:**
```
Original: This is the ~~text that will be removed~~ original text.
Modified: This is the original text.
```

**Example 4 - Empty Content:**
```
Original: This paragraph exists in the original document.
Modified: [EMPTY]
```

**Example 5 - Added New Content:**
```
Original: [EMPTY]
Modified: This is a completely new paragraph that didn't exist before.
```

### 📖 **How to Interpret the Report**

1. **Start from the top** and work your way down through each chunk
2. **Compare the Original and Modified sections** for each chunk
3. **Look for color-coded differences**:
   - Red text = removed content
   - Blue text = added content
4. **Skip chunks marked "No difference"** - these are identical
5. **Focus on chunks with differences** to understand what changed

### 💡 **Tips for Effective Reading**

- **Use a PDF reader** that supports color display (most modern readers do)
- **Zoom in** if the text is too small to read comfortably
- **Print the report** if you prefer physical review
- **Use the search function** to find specific terms or changes
- **Take notes** on important differences you find

### 🔍 **Understanding the Chunking**

- **Chunks are created** by splitting documents at natural boundaries (sentences, paragraphs)
- **Each chunk** represents a logical unit of text for comparison
- **Chunk numbers** help you reference specific sections
- **Chunk size** is optimized for readability and accuracy

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