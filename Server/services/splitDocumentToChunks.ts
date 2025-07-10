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

const MAX_CHUNK_SIZE = 1024;

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

// Helper to split long paragraphs
const splitLongTextToChunks = (text: string): string[] => {
	const paragraphs = text.split('\n');
	const chunks: string[] = [];
	let currentChunk = '';

	for (const paragraph of paragraphs) {
		if ((currentChunk + paragraph).length + 1 <= MAX_CHUNK_SIZE) {
			currentChunk += paragraph + '\n';
		} else {
			if (currentChunk.trim()) chunks.push(currentChunk.trim());
			if (paragraph.length > MAX_CHUNK_SIZE) {
				for (let i = 0; i < paragraph.length; i += MAX_CHUNK_SIZE) {
					chunks.push(paragraph.slice(i, i + MAX_CHUNK_SIZE).trim());
				}
				currentChunk = '';
			} else {
				currentChunk = paragraph + '\n';
			}
		}
	}
	if (currentChunk.trim()) chunks.push(currentChunk.trim());
	return chunks;
};

// PDF
const splitPdf = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const data = await pdfParse(buffer);
	const pages = data.text.split(/\f/);
	const chunks: ChunkResult[] = [];

	pages.forEach((page, pageIndex) => {
		const subChunks = splitLongTextToChunks(page);
		subChunks.forEach((chunk, i) => {
			chunks.push({ chunk, index: pageIndex * 100 + i, comparisonId });
		});
	});

	console.log(`PDF split into ${chunks.length} chunks`);
	return chunks;
};

// Word
const splitWord = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const result = await mammoth.extractRawText({ buffer });
	const paragraphs = result.value.split(/\n+/);
	const chunks: ChunkResult[] = [];

	paragraphs.forEach((p, paragraphIndex) => {
		const subChunks = splitLongTextToChunks(p);
		subChunks.forEach((chunk, i) => {
			chunks.push({ chunk, index: paragraphIndex * 100 + i, comparisonId });
		});
	});

	console.log(`Word split into ${chunks.length} chunks`);
	return chunks;
};

// Excel
const splitExcel = async (buffer: Buffer, comparisonId: string): Promise<ChunkResult[]> => {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const chunks: ChunkResult[] = [];
	let globalIndex = 0;

	for (const worksheet of workbook.worksheets) {
		worksheet.eachRow((row) => {
			const rowText = (row.values as any[])
				.slice(1)
				.map((cell: any) => (cell?.toString ? cell.toString() : ''))
				.join(' | ');

			const subChunks = splitLongTextToChunks(rowText);
			subChunks.forEach((chunk) => {
				chunks.push({ chunk, index: globalIndex++, comparisonId });
			});
		});
	}

	console.log(`Excel split into ${chunks.length} chunks`);
	return chunks;
};
