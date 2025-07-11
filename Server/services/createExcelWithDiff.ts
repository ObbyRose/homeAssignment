import ExcelJS from 'exceljs';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import stream from 'stream';
import { DiffChunk } from '../types';
import { diffWords } from 'diff';

function getExcelDiffFragments(original: string, modified: string, type: 'original' | 'modified') {
	const diff = diffWords(original, modified);
	return diff.map(part => {
		if (type === 'original' && part.removed) {
			return { text: part.value, color: { argb: 'FFFF0000' } }; // red
		} else if (type === 'modified' && part.added) {
			return { text: part.value, color: { argb: 'FF0000FF' } }; // blue
		} else if (!part.added && !part.removed) {
			return { text: part.value, color: { argb: 'FF000000' } }; // black
		}
		return null;
	}).filter(Boolean) as { text: string, color: { argb: string } }[];
}

export const generateAndSaveExcelWithDifferences = async (
	comparison: IComparison,
	differences: DiffChunk[]
): Promise<mongoose.Types.ObjectId> => {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Comparison');

	worksheet.columns = [
		{ header: 'Chunk #', key: 'index', width: 10 },
		{ header: 'Original', key: 'textA', width: 80 },
		{ header: 'Modified', key: 'textB', width: 80 },
		{ header: 'Has Difference', key: 'hasDifference', width: 15 },
	];

	differences.forEach((diff) => {
		const row = worksheet.addRow({
			index: diff.index,
			textA: '', // We'll fill this with rich text below
			textB: '',
			hasDifference: diff.hasDifference ? 'Yes' : 'No',
		});

		// Set rich text for Original
		const origFragments = getExcelDiffFragments(diff.textA, diff.textB, 'original');
		row.getCell('textA').value = { richText: origFragments.map(frag => ({ text: frag.text, font: { color: frag.color } })) };

		// Set rich text for Modified
		const modFragments = getExcelDiffFragments(diff.textA, diff.textB, 'modified');
		row.getCell('textB').value = { richText: modFragments.map(frag => ({ text: frag.text, font: { color: frag.color } })) };
	});

	const buffer = await workbook.xlsx.writeBuffer();

	const bucket = getGridFSBucket();
	const uploadStream = bucket.openUploadStream(`comparison-${comparison._id}.xlsx`, {
		contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});

	const readStream = new stream.PassThrough();
	readStream.end(Buffer.from(buffer));
	readStream.pipe(uploadStream);

	return new Promise((resolve, reject) => {
		uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
		uploadStream.on('error', (err) => reject(err));
	});
};