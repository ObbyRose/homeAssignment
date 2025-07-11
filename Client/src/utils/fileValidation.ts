export const allowedTypes = [
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const allowedExtensions = ['.pdf', '.docx', '.xlsx'];

export const fileExtensions = {
	'application/pdf': 'PDF',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel'
};

export const getFileTypeFromExtension = (fileName: string | undefined): string | null => {
	if (!fileName) return null;
	const extension = fileName.split('.').pop()?.toLowerCase();
	if (!extension) return null;
	switch (extension) {
		case 'pdf':
			return 'application/pdf';
		case 'docx':
			return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		case 'xlsx':
			return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		default:
			return null;
	}
};

export const validateFiles = (newFiles: File[]): string | null => {
	const validFiles = newFiles.filter(f => f && f.name);
	if (validFiles.length > 2) {
		return "Maximum 2 files allowed";
	}

	if (validFiles.length === 2) {
		const file1 = validFiles[0];
		const file2 = validFiles[1];
		
		// Get file types, fallback to extension if type is not available
		const type1 = file1.type || getFileTypeFromExtension(file1.name);
		const type2 = file2.type || getFileTypeFromExtension(file2.name);
		
		if (!type1 || !type2) {
			return "Unsupported file type. Only PDF, Word (.docx), and Excel (.xlsx) files are supported";
		}
		
		if (type1 !== type2) {
			return "Both files must be the same type (PDF, Word, or Excel)";
		}
		
		if (!allowedTypes.includes(type1)) {
			return "Only PDF, Word (.docx), and Excel (.xlsx) files are supported";
		}
	}

	return null;
}; 