import axios from "axios";

const API_BASE = 'http://localhost:5000/api/documents';

export const uploadFiles = async (files: File[], onProgress: (progress: number) => void): Promise<string> => {
	if (files.length !== 2) {
		throw new Error("Please select exactly 2 files");
	}

	const formData = new FormData();
	formData.append('fileA', files[0]);
	formData.append('fileB', files[1]);

	const response = await axios.post(`${API_BASE}/upload`, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		onUploadProgress: (progressEvent) => {
			if (progressEvent.total) {
				const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
				onProgress(progress);
			}
		},
	});

	return response.data.comparisonId;
};

export const compareDocuments = async (comparisonId: string): Promise<{ success: boolean }> => {
	const response = await axios.post(`${API_BASE}/compare/${comparisonId}`);
	return response.data;
};

export const downloadComparison = async (comparisonId: string): Promise<Blob> => {
	const response = await axios.get(`${API_BASE}/output/${comparisonId}`, {
		responseType: 'blob',
	});
	return new Blob([response.data]);
}; 