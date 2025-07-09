import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import { Readable } from 'stream';

interface ChunkResult {
	chunk: string;
	index: number;
	comparisonId: string;
}

export const splitDocumentToChunks = async (comparison: IComparison): Promise<ChunkResult[]> => {
	try {
		if (!comparison._id) {
			throw new Error('Comparison ID is required');
		}

		const bucket = getGridFSBucket();
		const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(comparison.fileAId));
		const buffer = await streamToBuffer(stream);

		switch (comparison.fileAType) {
			case 'pdf':
				return await splitPdf(buffer, comparison._id.toString());
			case 'word':
				return await splitWord(buffer, comparison._id.toString());
			case 'excel':
				return await splitExcel(buffer, comparison._id.toString());
			default:
				throw new Error(`Unsupported file type: ${comparison.fileAType}`);
		}
	} catch (error) {
		console.error('Error splitting document to chunks:', error);
		throw error;
	}
};

// Helper: Convert stream to buffer
const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
};

// ===== PDF SPLIT =====
const splitPdf = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	try {
		const data = await pdfParse(buffer);
		const pages = data.text.split(/\f/); // Form feed char (page break)

		console.log(`📄 PDF contains ${pages.length} pages`);
		return pages
			.map((page, i) => ({
				chunk: page.trim(),
				index: i,
				comparisonId,
			}))
			.filter(item => item.chunk.length > 0); // Remove empty pages
	} catch (error) {
		console.error('Error parsing PDF:', error);
		throw new Error('Failed to parse PDF file');
	}
};

// ===== WORD SPLIT =====
const splitWord = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	try {
		const result = await mammoth.extractRawText({ buffer });
		const paragraphs = result.value.split(/\n+/);

		console.log(`📝 Word contains ${paragraphs.length} paragraphs`);
		return paragraphs
			.map((p, i) => ({
				chunk: p.trim(),
				index: i,
				comparisonId,
			}))
			.filter(item => item.chunk.length > 0); // Remove empty paragraphs
	} catch (error) {
		console.error('Error parsing Word document:', error);
		throw new Error('Failed to parse Word document');
	}
};

// ===== EXCEL SPLIT =====
const splitExcel = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	try {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		const result: ChunkResult[] = [];
		let globalIndex = 0;

		for (const worksheet of workbook.worksheets) {
			worksheet.eachRow((row, rowIndex) => {
				const rowText = (row.values as any[])
					.slice(1) // First value is always undefined
					.map((cell: any) => (cell?.toString ? cell.toString() : ''))
					.join(' | ');

				if (rowText.trim().length > 0) {
					result.push({ 
						chunk: rowText.trim(), 
						index: globalIndex++, 
						comparisonId 
					});
				}
			});
		}

		console.log(`📊 Excel contains ${result.length} non-empty rows`);
		return result;
	} catch (error) {
		console.error('Error parsing Excel file:', error);
		throw new Error('Failed to parse Excel file');
	}
};
