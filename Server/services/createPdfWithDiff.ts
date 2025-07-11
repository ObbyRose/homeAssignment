import PDFDocument from 'pdfkit';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import { DiffChunk } from '../types';
import { diffArrays } from 'diff';
import { diffWords } from 'diff';

// Tokenize by word and punctuation
function tokenizeWithPunctuation(text: string): string[] {
	return text.match(/[\w]+|[.,@\/\?\;\:]+|\s+|\n/g) || [];
}

// Render only the original text, coloring removals in red
function renderOriginalColored(doc: any, original: string, modified: string) {
	const diff = diffWords(original, modified);
	diff.forEach((part, idx) => {
		if (part.removed) {
			doc.fillColor('red').text(part.value, { continued: idx !== diff.length - 1 });
		} else if (!part.added) {
			doc.fillColor('black').text(part.value, { continued: idx !== diff.length - 1 });
		}
	});
	doc.text('');
}

// Render only the modified text, coloring additions in blue
function renderModifiedColored(doc: any, original: string, modified: string) {
	const diff = diffWords(original, modified);
	diff.forEach((part, idx) => {
		if (part.added) {
			doc.fillColor('blue').text(part.value, { continued: idx !== diff.length - 1 });
		} else if (!part.removed) {
			doc.fillColor('black').text(part.value, { continued: idx !== diff.length - 1 });
		}
	});
	doc.text('');
}

// Render the full text, line by line
function renderFullTextOriginal(doc: any, original: string, modified: string) {
	const origLines = original.split('\n');
	const modLines = modified.split('\n');
	const maxLines = Math.max(origLines.length, modLines.length);

	for (let i = 0; i < maxLines; i++) {
		const origLine = origLines[i] || '';
		const modLine = modLines[i] || '';
		renderOriginalColored(doc, origLine, modLine);
	}
}

function renderFullTextModified(doc: any, original: string, modified: string) {
	const origLines = original.split('\n');
	const modLines = modified.split('\n');
	const maxLines = Math.max(origLines.length, modLines.length);

	for (let i = 0; i < maxLines; i++) {
		const origLine = origLines[i] || '';
		const modLine = modLines[i] || '';
		renderModifiedColored(doc, origLine, modLine);
	}
}

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
					doc.fontSize(12).font('Helvetica-Bold').text('Original:', { underline: true });
					doc.font('Helvetica');
					renderFullTextOriginal(doc, diff.textA, diff.textB);

					doc.moveDown(0.5);
					doc.fontSize(12).font('Helvetica-Bold').text('Modified:', { underline: true });
					doc.font('Helvetica');
					renderFullTextModified(doc, diff.textA, diff.textB);
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
