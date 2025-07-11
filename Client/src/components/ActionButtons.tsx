import { Button } from "./ui/button";

interface ActionButtonsProps {
	canCompare: boolean;
	showDownload: boolean;
	isUploading: boolean;
	isComparing: boolean;
	onCompare: () => void;
	onDownload: () => void;
}

export default function ActionButtons({
	canCompare,
	showDownload,
	isUploading,
	isComparing,
	onCompare,
	onDownload,
}: ActionButtonsProps) {
	return (
		<div className="flex gap-3">
			<Button
				onClick={onCompare}
				disabled={!canCompare}
				className="flex-1"
				size="lg"
			>
				{isUploading ? "Uploading..." : isComparing ? "Comparing..." : "Compare Documents"}
			</Button>
			
			{showDownload && (
				<Button
					onClick={onDownload}
					variant="outline"
					size="lg"
				>
					Download Comparison
				</Button>
			)}
		</div>
	);
} 