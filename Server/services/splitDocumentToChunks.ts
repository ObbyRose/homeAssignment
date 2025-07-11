import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import { Readable } from 'stream';

export interface ChunkResult {
	chunk: string;
	index: number;
	comparisonId: string;
}

const MAX_CHUNK_SIZE = 2000; // Increased for better context

export const splitDocumentToChunks = async (comparison: IComparison): Promise<ChunkResult[]> => {
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
};

// Convert stream to buffer
const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
};

// Smart chunking that respects sentence and paragraph boundaries
const splitTextIntoSentences = (text: string): string[] => {
	// Split by sentence endings, but be smart about it
	const sentences = text.split(/(?<=[.!?])\s+/);
	return sentences.filter(sentence => sentence.trim().length > 0);
};

const splitTextIntoChunks = (text: string): string[] => {
	const sentences = splitTextIntoSentences(text);
	const chunks: string[] = [];
	let currentChunk = '';

	for (const sentence of sentences) {
		// If adding this sentence would exceed max size, start a new chunk
		if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
			chunks.push(currentChunk.trim());
			currentChunk = sentence;
		} else {
			currentChunk += (currentChunk ? ' ' : '') + sentence;
		}
	}

	// Add the last chunk
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
};

// PDF splitting with better text preservation
const splitPdf = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const data = await pdfParse(buffer);
	const chunks: ChunkResult[] = [];
	let chunkIndex = 0;

	// Split by pages first, then by sentences
	const pages = data.text.split(/\f/);
	
	pages.forEach((page, pageIndex) => {
		if (page.trim().length === 0) return;
		
		const pageChunks = splitTextIntoChunks(page);
		pageChunks.forEach((chunk, i) => {
			chunks.push({
				chunk,
				index: chunkIndex++,
				comparisonId
			});
		});
	});

	console.log(`PDF split into ${chunks.length} chunks`);
	return chunks;
};

// Word splitting with better text preservation
const splitWord = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const result = await mammoth.extractRawText({ buffer });
	const chunks: ChunkResult[] = [];
	let chunkIndex = 0;

	// Split by paragraphs first, then by sentences
	const paragraphs = result.value.split(/\n+/);
	
	paragraphs.forEach((paragraph, paragraphIndex) => {
		if (paragraph.trim().length === 0) return;
		
		const paragraphChunks = splitTextIntoChunks(paragraph);
		paragraphChunks.forEach((chunk, i) => {
			chunks.push({
				chunk,
				index: chunkIndex++,
				comparisonId
			});
		});
	});

	console.log(`Word split into ${chunks.length} chunks`);
	return chunks;
};

// Excel splitting with better text preservation
const splitExcel = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const chunks: ChunkResult[] = [];
	let chunkIndex = 0;

	for (const worksheet of workbook.worksheets) {
		worksheet.eachRow((row, rowIndex) => {
			const rowText = (row.values as any[])
				.slice(1)
				.map((cell: any) => (cell?.toString ? cell.toString() : ''))
				.join(' | ');

			if (rowText.trim().length > 0) {
				chunks.push({
					chunk: rowText.trim(),
					index: chunkIndex++,
					comparisonId
				});
			}
		});
	}

	console.log(`Excel split into ${chunks.length} chunks`);
	return chunks;
};
