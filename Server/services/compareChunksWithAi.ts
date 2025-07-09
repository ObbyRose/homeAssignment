import axios from 'axios';
import DiffMatchPatch from 'diff-match-patch';
import { ChunkResult } from './splitDocumentToChunks';

const dmp = new DiffMatchPatch();

const HUGGINGFACE_API_URL =
	process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

export interface ChunkComparisonResult {
	markedA: string;
	markedB: string;
	index: number;
	hasDifference: boolean;
}

export const compareChunkPair = async (
	textA: string,
	textB: string,
	index: number
): Promise<ChunkComparisonResult> => {
	try {
		// Use zero-shot classification format
		const response = await axios.post(
			HUGGINGFACE_API_URL,
			{
				inputs: textA,
				parameters: {
					candidate_labels: [textB, "different text"]
				}
			},
			{
				headers: {
					Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
					'Content-Type': 'application/json'
				}
			}
		);

		const result = response.data;
		
		// Check if the first label (textB) has the highest score
		const labels = result.labels || [];
		const scores = result.scores || [];
		
		if (labels.length > 0 && scores.length > 0) {
			const topLabel = labels[0];
			const topScore = scores[0];
			
			// If textB is the top label with high confidence, they are similar
			if (topLabel === textB && topScore > 0.7) {
				return {
					markedA: textA,
					markedB: textB,
					index,
					hasDifference: false
				};
			}
		}

		// Use diff to find differences
		const diffs = dmp.diff_main(textA, textB);
		dmp.diff_cleanupSemantic(diffs);

		const markedA = diffs
			.map(([op, text]) => {
				if (op === -1) return `<mark style="background: #ffdddd">${text}</mark>`;
				if (op === 0) return text;
				return '';
			})
			.join('');

		const markedB = diffs
			.map(([op, text]) => {
				if (op === 1) return `<mark style="background: #ddffdd">${text}</mark>`;
				if (op === 0) return text;
				return '';
			})
			.join('');

		return {
			markedA,
			markedB,
			index,
			hasDifference: true
		};
	} catch (error: any) {
		console.error(`🔴 Error comparing chunk ${index}`, error?.message || error);
		
		// Fallback to simple text comparison if API fails
		if (textA.trim() === textB.trim()) {
			return {
				markedA: textA,
				markedB: textB,
				index,
				hasDifference: false
			};
		}
		
		// Use diff as fallback
		const diffs = dmp.diff_main(textA, textB);
		dmp.diff_cleanupSemantic(diffs);

		const markedA = diffs
			.map(([op, text]) => {
				if (op === -1) return `<mark style="background: #ffdddd">${text}</mark>`;
				if (op === 0) return text;
				return '';
			})
			.join('');

		const markedB = diffs
			.map(([op, text]) => {
				if (op === 1) return `<mark style="background: #ddffdd">${text}</mark>`;
				if (op === 0) return text;
				return '';
			})
			.join('');

		return {
			markedA,
			markedB,
			index,
			hasDifference: true
		};
	}
};

export const compareAllChunks = async (
	chunksA: ChunkResult[],
	chunksB: ChunkResult[]
): Promise<ChunkComparisonResult[]> => {
	const results: ChunkComparisonResult[] = [];

	const maxLength = Math.max(chunksA.length, chunksB.length);

	for (let i = 0; i < maxLength; i++) {
		const chunkA = chunksA[i]?.chunk || '';
		const chunkB = chunksB[i]?.chunk || '';

		// Skip completely empty chunks
		if (!chunkA.trim() && !chunkB.trim()) continue;

		const result = await compareChunkPair(chunkA, chunkB, i);
		results.push(result);
	}

	return results;
};
