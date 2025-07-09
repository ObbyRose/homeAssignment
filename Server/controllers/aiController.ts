import { Request, Response } from 'express';
import { Comparison, IComparison } from '../database/models/comparisonModel';
import { splitDocumentToChunks } from '../services/splitDocumentToChunks';
import { compareAllChunks } from '../services/compareChunksWithAi';

export const compareDocuments = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const comparison = await Comparison.findById(id);

		if (!comparison) {
			return res.status(404).json({ error: 'Comparison not found' });
		}

		// שלב 1: חילוץ צ'אנקים משני הקבצים
		console.log('🔄 Splitting File A...');
		const chunksA = await splitDocumentToChunks(comparison);

		console.log('🔄 Splitting File B...');
		const tempComparisonB = new Comparison({
			...comparison.toObject(),
			fileAId: comparison.fileBId,
			fileAType: comparison.fileBType,
			_id: comparison._id, // Keep the same comparison ID
		});
		const chunksB = await splitDocumentToChunks(tempComparisonB);

		// שלב 2: השוואת הצ'אנקים
		console.log('🧠 Comparing chunks...');
		const results = await compareAllChunks(chunksA, chunksB);

		// תשובה ללקוח
		return res.status(200).json({
			message: 'Comparison completed successfully',
			totalChunks: results.length,
			differences: results.filter(r => r.hasDifference).length,
			results,
		});
	} catch (error) {
		console.error('❌ Error comparing documents:', error);
		return res.status(500).json({ error: 'Failed to compare documents' });
	}
};
