import { useState } from "react";
import axios from "axios";
import { ModeToggle } from "../components/ui/mode-toggle";
import { toast } from "sonner";
import FileDropZone from "../components/FileDropZone";
import FilePreview from "../components/FilePreview";
import ProgressBars from "../components/ProgressBars";
import ActionButtons from "../components/ActionButtons";
import { validateFiles } from "../utils/fileValidation";
import { uploadFiles, compareDocuments, downloadComparison } from "../utils/api";

interface FileWithPreview extends File {
	preview?: string;
}

export default function MainPage() {
	const [files, setFiles] = useState<{ file: FileWithPreview; preview: string }[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [compareProgress, setCompareProgress] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const [isComparing, setIsComparing] = useState(false);
	const [comparisonId, setComparisonId] = useState<string | null>(null);

	const handleFileSelect = (selectedFiles: FileList | null) => {
		if (!selectedFiles) return;

		console.log("Selected files (FileList):", selectedFiles);
		const fileArray = Array.from(selectedFiles);
		console.log("File array:", fileArray);

		// Merge new files with existing files, no duplicates by name
		let merged = [...files];
		fileArray.forEach(newFile => {
			if (!merged.some(f => f.file.name === newFile.name)) {
				merged.push({ file: newFile, preview: URL.createObjectURL(newFile) });
			}
		});
		// Keep only the last 2 files
		if (merged.length > 2) merged = merged.slice(merged.length - 2);

		console.log("Merged files:", merged);

		const error = validateFiles(merged.map(f => f.file));
		if (error) {
			toast.error(error);
			return;
		}

		setFiles(merged);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		
		const droppedFiles = e.dataTransfer.files;
		handleFileSelect(droppedFiles);
	};

	const removeFile = (index: number) => {
		const newFiles = files.filter((_, i) => i !== index);
		setFiles(newFiles);
		setComparisonId(null); // Reset comparison when files change
	};

	const handleCompare = async () => {
		if (files.length !== 2) {
			toast.error("Please select exactly 2 files");
			return;
		}

		try {
			setIsUploading(true);
			setUploadProgress(0);
			setCompareProgress(0);
			
			toast.info("Uploading files...");
			const id = await uploadFiles(files.map(f => f.file), setUploadProgress);
			
			setIsUploading(false);
			setIsComparing(true);
			
			toast.info("Comparing documents...");

			const totalDuration = 85 * 1000;
			const intervalMs = 200; 
			const startTime = Date.now();
			let progress = 0;
			setCompareProgress(0);

			let finished = false;

			const progressTimer = setInterval(() => {
				if (finished) return;
				const elapsed = Date.now() - startTime;
				progress = Math.min(100, (elapsed / totalDuration) * 100);
				setCompareProgress(progress);
				if (progress >= 100) {
					clearInterval(progressTimer);
				}
			}, intervalMs);

			await compareDocuments(id);
			finished = true;
			setCompareProgress(100);
			clearInterval(progressTimer);

			setIsComparing(false);
			setComparisonId(id);
			toast.success("Comparison completed!");
			
		} catch (error) {
			setIsUploading(false);
			setIsComparing(false);
			setCompareProgress(0);
			if (axios.isAxiosError(error)) {
				toast.error(error.response?.data?.error || error.message);
			} else {
				toast.error(error instanceof Error ? error.message : "An error occurred");
			}
		}
	};

	const handleDownload = async () => {
		if (!comparisonId) return;

		try {
			const blob = await downloadComparison(comparisonId);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `comparison-${comparisonId}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			
			toast.success("Download started!");
		} catch (error) {
			if (axios.isAxiosError(error)) {
				toast.error(error.response?.data?.error || "Download failed");
			} else {
				toast.error("Download failed");
			}
		}
	};

	const canCompare = files.length === 2 && !isUploading && !isComparing;
	const showDownload = Boolean(comparisonId) && !isUploading && !isComparing;

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
			<div className="w-full max-w-2xl space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold">Document Comparison</h1>
					<ModeToggle />
				</div>

				{/* File Drop Zone */}
				<FileDropZone
					onFilesSelect={handleFileSelect}
					isDragOver={isDragOver}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				/>

				{/* File Previews */}
				<FilePreview
					files={files}
					onRemoveFile={removeFile}
					isUploading={isUploading}
					isComparing={isComparing}
				/>

				{/* Progress Bars */}
				<ProgressBars
					isUploading={isUploading}
					isComparing={isComparing}
					uploadProgress={uploadProgress}
					compareProgress={compareProgress}
				/>

				{/* Action Buttons */}
				<ActionButtons
					canCompare={canCompare}
					showDownload={showDownload}
					isUploading={isUploading}
					isComparing={isComparing}
					onCompare={handleCompare}
					onDownload={handleDownload}
				/>
			</div>
		</div>
	);
} 