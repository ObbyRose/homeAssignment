import { Document, Packer, Paragraph, TextRun, SectionType } from 'docx';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import stream from 'stream';
import { DiffChunk } from '../types';
import { diffWords } from 'diff';

// Helper: Get colored TextRuns for Word
function getWordDiffRuns(original: string, modified: string, type: 'original' | 'modified') {
	const diff = diffWords(original, modified);
	return diff.map(part => {
		if (type === 'original' && part.removed) {
			return new TextRun({ text: part.value, color: 'FF0000' }); // red
		} else if (type === 'modified' && part.added) {
			return new TextRun({ text: part.value, color: '0000FF' }); // blue
		} else if (!part.added && !part.removed) {
			return new TextRun({ text: part.value, color: '000000' }); // black
		}
		return null;
	}).filter(Boolean) as TextRun[];
}

export const generateAndSaveWordWithDifferences = async (
	comparison: IComparison,
	differences: DiffChunk[]
): Promise<mongoose.Types.ObjectId> => {
	const children: Paragraph[] = [];

	differences.forEach((diff) => {
		children.push(new Paragraph({ text: `Chunk #${diff.index}`, heading: 'Heading2' }));

		if (diff.hasDifference) {
			children.push(
				new Paragraph({
					children: [
						new TextRun({ text: 'Original: ', bold: true, underline: {} }),
						...getWordDiffRuns(diff.textA, diff.textB, 'original'),
					],
				}),
				new Paragraph({
					children: [
						new TextRun({ text: 'Modified: ', bold: true, underline: {} }),
						...getWordDiffRuns(diff.textA, diff.textB, 'modified'),
					],
				}),
				new Paragraph(''),
			);
		} else {
			children.push(
				new Paragraph({
					children: [
						new TextRun({ text: 'No difference', color: '888888' })
					]
				})
			);
		}
	});

	const doc = new Document({
		sections: [
			{
				properties: { type: SectionType.CONTINUOUS },
				children,
			},
		],
	});

	const buffer = await Packer.toBuffer(doc);

	const bucket = getGridFSBucket();
	const uploadStream = bucket.openUploadStream(`comparison-${comparison._id}.docx`, {
		contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});

	const readStream = new stream.PassThrough();
	readStream.end(buffer);
	readStream.pipe(uploadStream);

	return new Promise((resolve, reject) => {
		uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
		uploadStream.on('error', (err) => reject(err));
	});
};