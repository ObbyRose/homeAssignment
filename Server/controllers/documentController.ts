import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Comparison } from '../database/models/comparisonModel';
import { getFileType } from '../utils/fileUtil';
import { getGridFSBucket } from '../database/gridFS';
import fs from 'fs';

// Upload documents
export const uploadDocuments = async (req: Request, res: Response): Promise<void> => {
	try {
		console.log('Files received:', req.files);
		console.log('Request body:', req.body);
		
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };
		const fileA = files?.['fileA']?.[0];
		const fileB = files?.['fileB']?.[0];

		if (!fileA || !fileB) {
			console.log('Missing files. Available files:', Object.keys(files || {}));
			res.status(400).json({ 
				error: 'Both files are required.',
				received: Object.keys(files || {}),
				expected: ['fileA', 'fileB']
			});
			return;
		}

		console.log('File A:', fileA.originalname, 'Size:', fileA.size);
		console.log('File B:', fileB.originalname, 'Size:', fileB.size);

		const bucket = getGridFSBucket();

		// Save fileA to GridFS
		const fileAStream = fs.createReadStream(fileA.path);
		const uploadA = bucket.openUploadStream(fileA.originalname, {
			contentType: fileA.mimetype,
		});
		fileAStream.pipe(uploadA);

		// Save fileB to GridFS
		const fileBStream = fs.createReadStream(fileB.path);
		const uploadB = bucket.openUploadStream(fileB.originalname, {
			contentType: fileB.mimetype,
		});
		fileBStream.pipe(uploadB);

		// Wait for both to finish
		uploadA.on('finish', () => {
			uploadB.on('finish', async () => {
				const comparison = await Comparison.create({
					fileAName: fileA.originalname,
					fileBName: fileB.originalname,
					fileAType: getFileType(fileA.mimetype),
					fileBType: getFileType(fileB.mimetype),
					fileAId: uploadA.id,
					fileBId: uploadB.id,
					status: 'pending',
				});

				res.status(201).json({
					message: 'Files uploaded to GridFS and saved to DB',
					comparisonId: comparison._id,
					fileA: fileA.originalname,
					fileB: fileB.originalname
				});
			});
		});
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({ error: 'Failed to upload files' });
	}
};

// Get comparison details by ID
export const getComparisonDetails = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		const comparison = await Comparison.findById(id);

		if (!comparison) {
			res.status(404).json({ error: 'Comparison not found' });
			return;
		}

		res.status(200).json(comparison);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Failed to fetch comparison' });
	}
};

// Download output file
export const downloadOutputFile = async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		const comparison = await Comparison.findById(id);

		if (!comparison || !comparison.outputFileId) {
			res.status(404).json({ error: 'Output file not found' });
			return;
		}

		const bucket = getGridFSBucket();
		const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(comparison.outputFileId));

		// Set headers
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="diffed-output.${comparison.outputFileType || 'pdf'}"`);

		stream.pipe(res);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Failed to download output file' });
	}
};
