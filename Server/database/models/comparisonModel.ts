// Server/database/models/comparisonModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IComparison extends Document {
	fileAName: string;
	fileBName: string;
	fileAType: string; // 'pdf' | 'word' | 'excel'
	fileBType: string;
	fileAId: mongoose.Types.ObjectId; // GridFS ID
	fileBId: mongoose.Types.ObjectId;
	outputFileId?: mongoose.Types.ObjectId; // GridFS ID for result
	outputFileType?: string; // 'pdf' | 'word' | 'excel'
	status: 'pending' | 'processing' | 'done' | 'error';
	createdAt: Date;
	updatedAt: Date;
}

const ComparisonSchema = new Schema<IComparison>(
	{
		fileAName: { type: String, required: true },
		fileBName: { type: String, required: true },
		fileAType: { type: String, required: true },
		fileBType: { type: String, required: true },
		fileAId: { type: Schema.Types.ObjectId, required: true },
		fileBId: { type: Schema.Types.ObjectId, required: true },
		outputFileId: { type: Schema.Types.ObjectId }, // optional
		outputFileType: { type: String }, // optional
		status: {
			type: String,
			enum: ['pending', 'processing', 'done', 'error'],
			default: 'pending',
		},
	},
	{ timestamps: true }
);

export const Comparison = mongoose.model<IComparison>('Comparison', ComparisonSchema);
