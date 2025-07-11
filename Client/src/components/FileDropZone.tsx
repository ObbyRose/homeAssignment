import { useRef } from "react";
import { toast } from "sonner";

interface FileDropZoneProps {
	onFilesSelect: (files: FileList | null) => void;
	isDragOver: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	disabled?: boolean;
}

export default function FileDropZone({
	onFilesSelect,
	isDragOver,
	onDragOver,
	onDragLeave,
	onDrop,
	disabled = false,
}: FileDropZoneProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleClick = () => {
		if (disabled) {
			toast.info("Please wait for the current comparison to finish.");
			return;
		}
		fileInputRef.current?.click();
	};

	const handleDropZoneDragOver = (e: React.DragEvent) => {
		if (disabled) {
			e.preventDefault();
			toast.info("Please wait for the current comparison to finish.");
			return;
		}
		onDragOver(e);
	};

	const handleDropZoneDrop = (e: React.DragEvent) => {
		if (disabled) {
			e.preventDefault();
			toast.info("Please wait for the current comparison to finish.");
			return;
		}
		onDrop(e);
	};

	return (
		<div
			className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
				isDragOver 
					? 'border-primary bg-primary/5' 
					: 'border-muted-foreground/25 hover:border-primary/50'
			} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
			onDragOver={handleDropZoneDragOver}
			onDragLeave={onDragLeave}
			onDrop={handleDropZoneDrop}
		>
			<div className="space-y-4">
				<div className="text-4xl">📄</div>
				<div>
					<p className="text-lg font-medium">
						Drag and drop your files here, or{" "}
						<button
							type="button"
							className="text-primary hover:underline"
							onClick={handleClick}
							disabled={disabled}
						>
							click to browse
						</button>
					</p>
					<p className="text-sm text-muted-foreground mt-2">
						Upload 2 files of the same type (PDF, Word, or Excel)
					</p>
				</div>
			</div>
			
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept=".pdf,.docx,.xlsx"
				className="hidden"
				onChange={(e) => onFilesSelect(e.target.files)}
				disabled={disabled}
			/>
		</div>
	);
} 