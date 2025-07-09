import { Document, Packer, Paragraph, TextRun, SectionType } from 'docx';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import stream from 'stream';
import { DiffChunk } from '../types';

export const generateAndSaveWordWithDifferences = async (
	comparison: IComparison,
	differences: DiffChunk[]
): Promise<mongoose.Types.ObjectId> => {
	const children: Paragraph[] = [];

	differences.forEach((diff) => {
		const title = new Paragraph({ text: `Chunk #${diff.index}`, heading: 'Heading2' });

		const textA = new Paragraph({
			children: [
				new TextRun({ text: 'Original: ', bold: true }),
				new TextRun({ text: diff.textA, color: diff.hasDifference ? 'FF0000' : '000000' }),
			],
		});

		const textB = new Paragraph({
			children: [
				new TextRun({ text: 'Modified: ', bold: true }),
				new TextRun({ text: diff.textB, color: diff.hasDifference ? '00AA00' : '000000' }),
			],
		});

		children.push(title, textA, textB, new Paragraph(''));
	});

	const doc = new Document({
		sections: [
			{
				properties: {
					type: SectionType.CONTINUOUS,
				},
				children: children,
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
