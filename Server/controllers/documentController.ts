import { Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import { Comparison, IComparison } from '../database/models/comparisonModel';
import { getGridFSBucket } from '../database/gridFS';
import { getFileType } from '../utils/fileUtil';
import { DiffChunk } from '../types';

import { splitDocumentToChunks } from '../services/splitDocumentToChunks';
import { compareAllChunks, ChunkComparisonResult } from '../services/compareChunks';
import { generateAndSavePdfWithDifferences } from '../services/createPdfWithDiff';
import { generateAndSaveWordWithDifferences } from '../services/createWordWithDiff';
import { generateAndSaveExcelWithDifferences } from '../services/createExcelWithDiff';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = ['pdf', 'word', 'excel'];

// Helper function to clean up temporary files
const cleanupTempFiles = (files: (Express.Multer.File | undefined)[]) => {
	files.forEach(file => {
		if (file && fs.existsSync(file.path)) {
			fs.unlinkSync(file.path);
		}
	});
};

const validateFile = (file: Express.Multer.File | undefined): string | null => {
	if (!file) return 'File is required';
	
	if (file.size > MAX_FILE_SIZE) {
		return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
	}
	
	const fileType = getFileType(file.mimetype);
	if (!ALLOWED_FILE_TYPES.includes(fileType)) {
		return `File type ${fileType} is not supported`;
	}
	
	return null;
};

// Helper function to convert ChunkComparisonResult to DiffChunk
const convertToDiffChunk = (result: ChunkComparisonResult): DiffChunk => {
	return {
		index: result.index,
		textA: result.markedA,
		textB: result.markedB,
		diffHtml: result.hasDifference ? `<div>${result.markedA}</div><div>${result.markedB}</div>` : '',
		hasDifference: result.hasDifference
	};
};

export const uploadDocuments = async (req: Request, res: Response) => {
	const files = req.files as { [fieldname: string]: Express.Multer.File[] };
	const fileA = files?.['fileA']?.[0];
	const fileB = files?.['fileB']?.[0];

	try {
		// Validate files
		const fileAError = validateFile(fileA);
		const fileBError = validateFile(fileB);
		
		if (fileAError) {
			cleanupTempFiles([fileA]);
			return res.status(400).json({ error: `File A: ${fileAError}` });
		}
		
		if (fileBError) {
			cleanupTempFiles([fileA, fileB]);
			return res.status(400).json({ error: `File B: ${fileBError}` });
		}

		const fileA_ = fileA!;
		const fileB_ = fileB!;

		const bucket = getGridFSBucket();

		// Upload files in parallel for better performance
		try {
			const uploadPromises = [
				// Upload file A
				new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
					const fileAStream = fs.createReadStream(fileA_.path);
					const uploadA = bucket.openUploadStream(fileA_.originalname, {
						contentType: fileA_.mimetype,
					});
					fileAStream.pipe(uploadA);
					
					uploadA.on('finish', () => resolve(uploadA.id as mongoose.Types.ObjectId));
					uploadA.on('error', (error: any) => reject(new Error('Failed to upload file A')));
				}),
				
				// Upload file B
				new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
					const fileBStream = fs.createReadStream(fileB_.path);
					const uploadB = bucket.openUploadStream(fileB_.originalname, {
						contentType: fileB_.mimetype,
					});
					fileBStream.pipe(uploadB);
					
					uploadB.on('finish', () => resolve(uploadB.id as mongoose.Types.ObjectId));
					uploadB.on('error', (error: any) => reject(new Error('Failed to upload file B')));
				})
			];

			// Wait for both uploads to complete in parallel
			const [fileAId, fileBId] = await Promise.all(uploadPromises);

			// Create comparison record
			const comparison = await Comparison.create({
				fileAName: fileA_.originalname,
				fileBName: fileB_.originalname,
				fileAType: getFileType(fileA_.mimetype),
				fileBType: getFileType(fileB_.mimetype),
				fileAId: fileAId,
				fileBId: fileBId,
				status: 'pending',
			});

			// Clean up temp files after successful upload
			cleanupTempFiles([fileA_, fileB_]);

			return res.status(201).json({
				message: 'Files uploaded and saved',
				comparisonId: comparison._id,
			});

		} catch (uploadError) {
			cleanupTempFiles([fileA_, fileB_]);
			return res.status(500).json({ error: 'Failed to upload files to GridFS' });
		}

	} catch (err) {
		console.error('Upload error:', err);
		cleanupTempFiles([fileA, fileB]);
		return res.status(500).json({ error: 'Failed to upload files' });
	}
};

export const compareDocuments = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		
		// Validate ObjectId
		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: 'Invalid comparison ID' });
		}

		const comparison = await Comparison.findById(id);
		if (!comparison) {
			return res.status(404).json({ error: 'Comparison not found' });
		}

		// Check if already processed
		if (comparison.status === 'done') {
			return res.status(200).json({
				message: 'Comparison already completed',
				comparisonId: comparison._id,
			});
		}

		// Update status to processing
		comparison.status = 'processing';
		await comparison.save();

		console.log('Splitting File A');
		const chunksA = await splitDocumentToChunks(comparison);

		console.log('Splitting File B');
		// Create a proper object for file B processing
		const fileBComparison: IComparison = {
			_id: comparison._id,
			fileAId: comparison.fileBId,
			fileAType: comparison.fileBType,
			fileAName: comparison.fileBName,
			fileBName: comparison.fileAName,
			fileBId: comparison.fileAId,
			fileBType: comparison.fileAType,
			status: comparison.status,
			createdAt: comparison.createdAt,
			updatedAt: comparison.updatedAt,
		} as IComparison;
		
		const chunksB = await splitDocumentToChunks(fileBComparison);

		console.log('Comparing...');
		const results = await compareAllChunks(chunksA, chunksB);

		// Convert results to DiffChunk format
		const diffChunks: DiffChunk[] = results.map(convertToDiffChunk);

		// Generate output file
		let outputFileId: mongoose.Types.ObjectId;
		switch (comparison.fileAType) {
			case 'pdf':
				outputFileId = await generateAndSavePdfWithDifferences(comparison, diffChunks);
				break;
			case 'word':
				outputFileId = await generateAndSaveWordWithDifferences(comparison, diffChunks);
				break;
			case 'excel':
				outputFileId = await generateAndSaveExcelWithDifferences(comparison, diffChunks);
				break;
			default:
				throw new Error(`Unsupported format: ${comparison.fileAType}`);
		}

		// Update comparison with results
		comparison.outputFileId = outputFileId;
		comparison.outputFileType = comparison.fileAType;
		comparison.status = 'done';
		await comparison.save();

		return res.status(200).json({
			message: 'Comparison completed successfully',
			comparisonId: comparison._id,
			totalChunks: results.length,
			differences: results.filter(r => r.hasDifference).length,
		});
	} catch (err) {
		console.error('❌ Compare Error:', err);
		
		// Update status to error if comparison exists
		if (req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)) {
			try {
				const comparison = await Comparison.findById(req.params.id);
				if (comparison) {
					comparison.status = 'error';
					await comparison.save();
				}
			} catch (updateError) {
				console.error('Failed to update error status:', updateError);
			}
		}
		
		return res.status(500).json({ error: 'Failed to compare documents' });
	}
};

export const getComparisonDetails = async (req: Request, res: Response) => {
	try {
		const comparison = await Comparison.findById(req.params.id);
		if (!comparison) {
			return res.status(404).json({ error: 'Not found' });
		}
		return res.status(200).json(comparison);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to fetch comparison' });
	}
};

export const downloadOutputFile = async (req: Request, res: Response) => {
	try {
		const comparison = await Comparison.findById(req.params.id);
		if (!comparison?.outputFileId) {
			return res.status(404).json({ error: 'Output file not found' });
		}

		const bucket = getGridFSBucket();
		const stream = bucket.openDownloadStream(
			new mongoose.Types.ObjectId(comparison.outputFileId)
		);

		function getExtension(type: string | undefined) {
			if (!type) return 'pdf';
			if (type === 'word') return 'docx';
			if (type === 'excel') return 'xlsx';
			return type;
		}

		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="comparison-${comparison._id}.${getExtension(comparison.outputFileType)}"`
		);

		stream.pipe(res);
		return;
	} catch (err) {
		return res.status(500).json({ error: 'Failed to download file' });
	}
};
