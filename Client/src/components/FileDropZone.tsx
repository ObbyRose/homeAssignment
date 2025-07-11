import { useRef } from "react";

interface FileDropZoneProps {
	onFilesSelect: (files: FileList | null) => void;
	isDragOver: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
}

export default function FileDropZone({
	onFilesSelect,
	isDragOver,
	onDragOver,
	onDragLeave,
	onDrop,
}: FileDropZoneProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div
			className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
				isDragOver 
					? 'border-primary bg-primary/5' 
					: 'border-muted-foreground/25 hover:border-primary/50'
			}`}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<div className="space-y-4">
				<div className="text-4xl">📄</div>
				<div>
					<p className="text-lg font-medium">
						Drag and drop your files here, or{" "}
						<button
							type="button"
							className="text-primary cursor-pointer hover:underline"
							onClick={() => fileInputRef.current?.click()}
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
			/>
		</div>
	);
} 