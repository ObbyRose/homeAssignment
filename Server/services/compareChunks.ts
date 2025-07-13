import { ChunkResult } from './splitDocumentToChunks';
import { diffWords } from 'diff';

export interface ChunkComparisonResult {
	markedA: string;
	markedB: string;
	index: number;
	hasDifference: boolean;
	originalIndex?: number;
	modifiedIndex?: number;
}

// Enhanced comparison with proper content alignment
export const compareAllChunks = async (
	chunksA: ChunkResult[],
	chunksB: ChunkResult[]
): Promise<ChunkComparisonResult[]> => {
	const results: ChunkComparisonResult[] = [];
	
	// Create a unified text representation for better alignment
	const fullTextA = chunksA.map(chunk => chunk.chunk).join('\n\n');
	const fullTextB = chunksB.map(chunk => chunk.chunk).join('\n\n');
	
	// Use the diff library to get a proper alignment of the full texts
	const fullDiff = diffWords(fullTextA, fullTextB);
	
	// Reconstruct chunks based on the diff
	let currentChunkA = '';
	let currentChunkB = '';
	let chunkIndex = 0;
	let chunkAIndex = 0;
	let chunkBIndex = 0;
	
	// Process diff changes synchronously first
	for (let diffIndex = 0; diffIndex < fullDiff.length; diffIndex++) {
		const change = fullDiff[diffIndex];
		
		// Add null check for change
		if (!change) continue;
		
		if (change.added) {
			currentChunkB += change.value;
		} else if (change.removed) {
			currentChunkA += change.value;
		} else {
			// Same content - add to both
			currentChunkA += change.value;
			currentChunkB += change.value;
		}
		
		// Check if we've reached a chunk boundary
		const shouldSplit = shouldSplitChunk(currentChunkA, currentChunkB, chunksA, chunksB, chunkAIndex, chunkBIndex);
		
		if (shouldSplit && (currentChunkA.trim() || currentChunkB.trim())) {
			// Finalize current chunk
			const result = await compareChunkPair(currentChunkA.trim(), currentChunkB.trim(), chunkIndex);
			result.originalIndex = chunkAIndex;
			result.modifiedIndex = chunkBIndex;
			results.push(result);
			
			// Reset for next chunk
			currentChunkA = '';
			currentChunkB = '';
			chunkIndex++;
			chunkAIndex++;
			chunkBIndex++;
		}
	}
	
	// Handle remaining content
	if (currentChunkA.trim() || currentChunkB.trim()) {
		const result = await compareChunkPair(currentChunkA.trim(), currentChunkB.trim(), chunkIndex);
		result.originalIndex = chunkAIndex;
		result.modifiedIndex = chunkBIndex;
		results.push(result);
	}
	
	return results;
};

// Determine if we should split into a new chunk
const shouldSplitChunk = (
	currentA: string, 
	currentB: string, 
	chunksA: ChunkResult[], 
	chunksB: ChunkResult[], 
	chunkAIndex: number, 
	chunkBIndex: number
): boolean => {
	// Split if we've reached the end of either document
	if (chunkAIndex >= chunksA.length || chunkBIndex >= chunksB.length) {
		return true;
	}
	
	// Split if current content is getting too large
	if (currentA.length > 1024 || currentB.length > 1024) {
		return true;
	}
	
	// Split if we have significant content and hit a natural boundary
	const hasContent = currentA.trim().length > 0 || currentB.trim().length > 0;
	const hasBoundary = currentA.includes('\n\n') || currentB.includes('\n\n');
	
	return hasContent && hasBoundary;
};

// Enhanced chunk comparison with inline difference marking
export const compareChunkPair = async (
	textA: string,
	textB: string,
	index: number
): Promise<ChunkComparisonResult> => {
	try {
		// Handle empty chunks
		if (textA.trim().length === 0 && textB.trim().length === 0) {
			return {
				markedA: textA,
				markedB: textB,
				index,
				hasDifference: false
			};
		}
		
		if (textA.trim().length === 0) {
			return {
				markedA: '[EMPTY]',
				markedB: textB,
				index,
				hasDifference: true
			};
		}
		
		if (textB.trim().length === 0) {
			return {
				markedA: textA,
				markedB: '[EMPTY]',
				index,
				hasDifference: true
			};
		}
		
		// Quick exact match check
		if (textA === textB) {
			return {
				markedA: textA,
				markedB: textB,
				index,
				hasDifference: false
			};
		}
		
		// Normalize whitespace
		const normalizedA = textA.replace(/\s+/g, ' ').trim();
		const normalizedB = textB.replace(/\s+/g, ' ').trim();
		
		// Check normalized exact match
		if (normalizedA === normalizedB) {
			return {
				markedA: textA,
				markedB: textB,
				index,
				hasDifference: false
			};
		}
		
		// Use the 'diff' library for word-level comparison with inline marking
		const wordDiff = diffWords(normalizedA, normalizedB);
		let markedA = '';
		let markedB = '';
		
		wordDiff.forEach(change => {
			if (!change) return; // Skip undefined changes
			
			if (change.added) {
				markedB += `**${change.value}**`; // Inline marking for added text
			} else if (change.removed) {
				markedA += `~~${change.value}~~`; // Inline marking for removed text
			} else {
				markedA += change.value;
				markedB += change.value;
			}
		});
		
		return {
			markedA: markedA.trim(),
			markedB: markedB.trim(),
			index,
			hasDifference: markedA !== textA || markedB !== textB
		};
	} catch (error) {
		console.error('Error comparing chunks:', error);
		return {
			markedA: textA,
			markedB: textB,
			index,
			hasDifference: false
		};
	}
};
