import ExcelJS from 'exceljs';
import { getGridFSBucket } from '../database/gridFS';
import { IComparison } from '../database/models/comparisonModel';
import mongoose from 'mongoose';
import stream from 'stream';
import { DiffChunk } from '../types';

export const generateAndSaveExcelWithDifferences = async (
	comparison: IComparison,
	differences: DiffChunk[]
): Promise<mongoose.Types.ObjectId> => {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Comparison');

	worksheet.columns = [
		{ header: 'Chunk #', key: 'index', width: 10 },
		{ header: 'Original', key: 'textA', width: 50 },
		{ header: 'Modified', key: 'textB', width: 50 },
		{ header: 'Has Difference', key: 'hasDifference', width: 15 },
	];

	differences.forEach((diff) => {
		worksheet.addRow({
			index: diff.index,
			textA: diff.textA,
			textB: diff.textB,
			hasDifference: diff.hasDifference ? 'Yes' : 'No',
		});
	});

	worksheet.eachRow((row, rowIndex) => {
		if (rowIndex > 1 && row.getCell(4).value === 'Yes') {
			row.eachCell((cell) => {
				cell.font = { color: { argb: 'FFFF0000' } };
			});
		}
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
