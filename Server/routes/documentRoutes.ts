import express from 'express';
import multer from 'multer';
import {
	uploadDocuments,
	compareDocuments,
	getComparisonDetails,
	downloadOutputFile,
} from '../controllers/documentController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.fields([
	{ name: 'fileA', maxCount: 1 },
	{ name: 'fileB', maxCount: 1 },
]), uploadDocuments);
router.post('/compare/:id', compareDocuments);
router.get('/:id', getComparisonDetails);
router.get('/output/:id', downloadOutputFile);

export default router;
