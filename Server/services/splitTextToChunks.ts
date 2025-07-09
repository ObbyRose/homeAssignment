export const splitTextToChunks = (text: string, maxWordsPerChunk = 200): string[] => {
	const words = text.split(/\s+/);
	const chunks: string[] = [];

	for (let i = 0; i < words.length; i += maxWordsPerChunk) {
		const chunk = words.slice(i, i + maxWordsPerChunk).join(' ');
		chunks.push(chunk);
	}

	return chunks;
};