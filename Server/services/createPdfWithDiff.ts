import PDFDocument from 'pdfkit';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import { DiffChunk } from '../types';

export const generateAndSavePdfWithDifferences = async (
	comparison: IComparison,
	differences: DiffChunk[]
): Promise<mongoose.Types.ObjectId> => {
	return new Promise((resolve, reject) => {
		try {
			const bucket = getGridFSBucket();
			const uploadStream = bucket.openUploadStream(`comparison-${comparison._id}.pdf`, {
				contentType: 'application/pdf',
			});
			const doc = new PDFDocument();
			doc.pipe(uploadStream);

			doc.fontSize(16).text(`Comparison Report`, { underline: true }).moveDown();

			differences.forEach((diff) => {
				doc.fontSize(12);
				doc.text(`Chunk #${diff.index}`);

				if (diff.hasDifference) {
					doc.fillColor('red').text(`Original: ${diff.textA}`);
					doc.fillColor('green').text(`Modified: ${diff.textB}`);
				} else {
					doc.fillColor('gray').text(`No difference`);
				}

				doc.moveDown();
			});

			doc.end();

			uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
			uploadStream.on('error', (err) => reject(err));
		} catch (error) {
			reject(error);
		}
	});
};
