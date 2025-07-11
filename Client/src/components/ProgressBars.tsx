import { Progress } from "./ui/progress";

interface ProgressBarsProps {
	isUploading: boolean;
	isComparing: boolean;
	uploadProgress: number;
	compareProgress: number;
}

export default function ProgressBars({
	isUploading,
	isComparing,
	uploadProgress,
	compareProgress,
}: ProgressBarsProps) {
	if (!isUploading && !isComparing) return null;

	return (
		<div className="space-y-2">
			{isUploading && (
				<div>
					<p className="text-sm font-medium mb-1">Uploading files...</p>
					<Progress value={uploadProgress} className="h-2" />
				</div>
			)}
			{isComparing && (
				<div>
					<p className="text-sm font-medium mb-1">Comparing documents...</p>
					<Progress value={compareProgress} className="h-2" />
				</div>
			)}
		</div>
	);
} 