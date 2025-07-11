import { Button } from "./ui/button";

interface FileWithPreview extends File {
	preview?: string;
}

interface FilePreviewProps {
	files: { file: FileWithPreview; preview: string }[];
	onRemoveFile: (index: number) => void;
	isUploading: boolean;
	isComparing: boolean;
}

export default function FilePreview({
	files,
	onRemoveFile,
	isUploading,
	isComparing,
}: FilePreviewProps) {
	const fileExtensions = {
		'application/pdf': 'PDF',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel'
	};

	const getFileIcon = (fileType: string | undefined, fileName: string | undefined) => {
		if (!fileType) {
			// Fallback to file extension if type is not available
			if (!fileName) return '📄';
			const extension = fileName.split('.').pop()?.toLowerCase();
			if (extension === 'pdf') return '📄';
			if (extension === 'docx') return '📝';
			if (extension === 'xlsx') return '📊';
			return '📄';
		}
		
		if (fileType.includes('pdf')) return '📄';
		if (fileType.includes('word') || fileType.includes('docx')) return '📝';
		if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xlsx')) return '📊';
		return '📄';
	};

	const getFileType = (fileType: string | undefined, fileName: string | undefined) => {
		if (!fileType) {
			// Fallback to file extension if type is not available
			if (!fileName) return 'Unknown';
			const extension = fileName.split('.').pop()?.toLowerCase();
			if (extension === 'pdf') return 'PDF';
			if (extension === 'docx') return 'Word';
			if (extension === 'xlsx') return 'Excel';
			return 'Unknown';
		}
		
		return fileExtensions[fileType as keyof typeof fileExtensions] || 'Unknown';
	};

	const getFileSize = (file: FileWithPreview) => {
		if (!file || typeof file.size !== 'number' || isNaN(file.size)) {
			return 'Unknown size';
		}
		
		const sizeInMB = file.size / 1024 / 1024;
		if (sizeInMB < 1) {
			return `${(file.size / 1024).toFixed(2)} KB`;
		}
		return `${sizeInMB.toFixed(2)} MB`;
	};

	if (files.length === 0) return null;

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-medium">Selected Files:</h3>
			{files.map((fileObj, index) => (
				<div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
					<div className="flex items-center space-x-3">
						<div className="text-2xl">
							{getFileIcon(fileObj.file.type, fileObj.file.name)}
						</div>
						<div>
							<p className="font-medium">{fileObj.file.name || 'Unknown File'}</p>
							<p className="text-sm text-muted-foreground">
								{getFileType(fileObj.file.type, fileObj.file.name)} • {getFileSize(fileObj.file)}
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onRemoveFile(index)}
						disabled={isUploading || isComparing}
					>
						Remove
					</Button>
				</div>
			))}
		</div>
	);
} 