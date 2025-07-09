import express from 'express';
import multer from 'multer';
import { uploadDocuments, getComparisonDetails, downloadOutputFile } from '../controllers/documentController';

const router = express.Router();

const storage = multer.diskStorage({
	destination: './uploads/',
	filename: (_: any, file: any, cb: any) => {
		cb(null, Date.now() + '-' + file.originalname);
	},
});

const upload = multer({ storage });

// More flexible route that accepts any files
router.post('/upload', upload.any(), uploadDocuments);
router.get('/:id', getComparisonDetails);
router.get('/:id/output', downloadOutputFile);

export default router;
